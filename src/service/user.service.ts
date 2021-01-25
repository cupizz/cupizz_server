import { Friend, Gender, HaveKids, OnlineStatus, Religious, Role, User, UsualType } from '@prisma/client';
import request from 'request';
import { AuthService, NotificationService } from '.';
import { Config } from '../config';
import Strings from '../constants/strings';
import SubscriptionKey from '../constants/subscriptionKey';
import { Context } from '../context';
import { ClientError, ErrorEmailExisted, ErrorLockedAccount, ErrorOtpIncorrect, ErrorTokenIncorrect, ErrorTrialExpired, ValidationError } from '../model/error';
import { Permission } from '../model/permission';
import { JwtRegisterPayload } from '../model/registerPayload';
import { DefaultRole } from '../model/role';
import { NexusGenAllTypes } from '../schema/generated/nexus';
import { FriendStatusEnum } from '../schema/types';
import { prisma, pubsub, redis } from '../server';
import { logger } from '../utils/logger';
import OtpHandler from '../utils/otpHandler';
import { PasswordHandler } from '../utils/passwordHandler';
import { Validator } from '../utils/validator';
import { RecommendService } from './recommend.service';
import fs from 'fs';
import { calculateAge } from '../utils/helper';
import { ResultValue } from '@nexus/schema/dist/core';

class UserService {
    public canAccessPrivateAccount(ctx: Context, targetUser: User) {
        return AuthService.authorize(ctx, { values: [Permission.user.list] }, false)
            || (ctx.user?.id === targetUser?.id && ctx.user && targetUser)
            || (targetUser && !targetUser?.isPrivate);
    }

    public async validateValidAccount(user: User) {
        if (user.roleId === DefaultRole.trial.id && user.createdAt.getTime() + Config.trialTime.value * 60 * 1000 < Date.now()) {
            throw ErrorTrialExpired;
        } else if (user.status === 'disabled') {
            throw ErrorLockedAccount;
        }
    }

    /**
     * @returns OTP chỉ được trả về trong môi trường dev, vì thế sử dụng cẩn thận
     */
    public async registerEmail(email: string): Promise<{
        token: string,
        otp?: string
    }> {
        let socialProvider = (await prisma.socialProvider.findOne({
            where: {
                id_type: {
                    id: email,
                    type: 'email'
                }
            }, include: { user: true }
        }));

        if (socialProvider) {
            throw ErrorEmailExisted;
        }
        const otpHandler = new OtpHandler();
        const otpToken = otpHandler.send(email)

        return otpToken;
    }

    public async verifyOtp(token: string, otp: string): Promise<string> {
        const email = OtpHandler.compare(token, otp);

        if (!email) {
            throw ErrorOtpIncorrect;
        }

        const registerPayload: JwtRegisterPayload = { type: 'email', id: email }

        return AuthService.sign(registerPayload, Config.registerExpireTime.value);
    }

    public async register(token: string, data: {
        nickName: string; // String!
        password?: string; // String
    }): Promise<User> {
        const payload = AuthService.verify<JwtRegisterPayload>(token);

        if (!payload?.type || !payload?.id) {
            throw ErrorTokenIncorrect;
        } else if (await prisma.socialProvider.findOne({
            where: {
                id_type: {
                    type: payload.type,
                    id: payload.id,
                }
            }
        })) {
            throw ErrorEmailExisted
        } else if (payload.type == 'email') {
            if (data.password) {
                Validator.password(data.password);
            } else {
                throw ValidationError('Register with email require a password');
            }
        }
        Validator.nickname(data.nickName);

        return prisma.user.create({
            data: {
                nickName: data.nickName,
                password: PasswordHandler.encode(data.password),

                // Load from social network
                ...(payload?.avatar ? { avatar: { create: { type: 'image', url: payload.avatar } } } : {}),
                phoneNumber: payload.phoneNumber,

                role: { connect: { id: DefaultRole.trial.id } },
                socialProvider: { create: payload },
                pushNotiSetting: ['like', 'matching', 'newMessage', 'other'],
                allowMatching: true,
                isPrivate: false,
            }
        });
    }

    public async getFriendStatus(myId: string, otherId: string): Promise<{ status: FriendStatusEnum, data: Friend }> {

        let status: FriendStatusEnum = FriendStatusEnum.none;
        let friend;

        if (!myId || !otherId) { status = FriendStatusEnum.none; }
        else if (otherId === myId) { status = FriendStatusEnum.me; }
        else {
            friend = await prisma.friend.findOne({
                where: {
                    senderId_receiverId: {
                        receiverId: myId,
                        senderId: otherId
                    }
                }
            })

            if (friend) {
                status = friend.acceptedAt ? FriendStatusEnum.friend : FriendStatusEnum.received;
            } else {
                friend = await prisma.friend.findOne({
                    where: {
                        senderId_receiverId: {
                            senderId: myId,
                            receiverId: otherId
                        }
                    }
                })

                status = !friend ? FriendStatusEnum.none :
                    (friend.acceptedAt ? FriendStatusEnum.friend : FriendStatusEnum.sent);
            }
        }

        return {
            status: status,
            data: friend
        }
    }

    /**
     * Nếu không truyền trạng thái thì chỉ cập nhật lại last online
     */
    public async updateOnlineStatus(user: User, status?: OnlineStatus) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastOnline: new Date(),
                ...(status ? { onlineStatus: status } : {})
            }
        })
        if (status) {
            pubsub.publish(
                SubscriptionKey.onlineFriend, {
                    status: status, user: user
                } as ResultValue<'Subscription', 'onlineUser'>)
            logger(`${user.nickName}(${user.id}) ${status}`);
        }
    }

    public async readFriend(ctx: Context, targetUserId: string) {
        AuthService.authenticate(ctx);
        const friendData = await this.getFriendStatus(ctx.user.id, targetUserId);
        switch (friendData.status) {
            case FriendStatusEnum.received:
                await prisma.friend.update({
                    where: {
                        senderId_receiverId: {
                            receiverId: ctx.user.id,
                            senderId: targetUserId
                        }
                    },
                    data: { readSent: true },
                })
                break;
            case FriendStatusEnum.friend:
                if (friendData.data.senderId === ctx.user.id) {

                    await prisma.friend.update({
                        where: {
                            senderId_receiverId: {
                                senderId: ctx.user.id,
                                receiverId: targetUserId
                            }
                        },
                        data: { readAccepted: true },
                    });
                }
                break;
        }
    }

    public async addFriend(currentUserId: string, targetUserId: string, isSuperLike: boolean = false): Promise<NexusGenAllTypes['FriendType']> {
        const friendData = await this.getFriendStatus(currentUserId, targetUserId);
        switch (friendData.status) {
            case FriendStatusEnum.me:
                throw ClientError(Strings.error.cannotDoOnYourself);
            case FriendStatusEnum.none:
                const sentData = await prisma.friend.create({
                    data: {
                        receiver: { connect: { id: targetUserId } },
                        sender: { connect: { id: currentUserId } },
                        isSuperLike: isSuperLike,
                        readSent: false,
                        readAccepted: false,
                    },
                    include: { sender: { include: { avatar: true } }, receiver: true }
                });
                RecommendService.regenerateRecommendableUsers(currentUserId)
                NotificationService.sendLikeOrMatchingNotify('like', sentData.sender, sentData.receiver, isSuperLike)
                this.updateLikeDislikeCount(targetUserId);
                return { status: 'sent', data: sentData }
            case FriendStatusEnum.sent:
                RecommendService.regenerateRecommendableUsers(currentUserId)
                throw ClientError(Strings.error.cannotAddFriendTwice);
            case FriendStatusEnum.received:
                const friendData = await prisma.friend.update({
                    where: {
                        senderId_receiverId: {
                            receiverId: currentUserId,
                            senderId: targetUserId
                        }
                    },
                    data: { acceptedAt: new Date() },
                    include: { sender: true, receiver: { include: { avatar: true } } }
                })
                NotificationService.sendLikeOrMatchingNotify('matching', friendData.receiver, friendData.sender, isSuperLike)
                return { status: 'friend', data: sentData }
            case FriendStatusEnum.friend:
                throw new Error(Strings.error.youWereBothFriendOfEachOther);
        }
    }

    public async removeFriend(ctx: Context, targetUserId: string): Promise<void> {
        AuthService.authenticate(ctx);
        const friendData = await this.getFriendStatus(ctx.user.id, targetUserId);
        switch (friendData.status) {
            case FriendStatusEnum.me:
                throw ClientError(Strings.error.cannotDoOnYourself);
            case FriendStatusEnum.none:
                await RecommendService.dislikeUser(ctx, targetUserId);
                break;
            default:
                await prisma.friend.deleteMany({
                    where: {
                        OR: [
                            {
                                senderId: ctx.user.id,
                                receiverId: targetUserId,
                            },
                            {
                                senderId: targetUserId,
                                receiverId: ctx.user.id,
                            },
                        ]
                    }
                })
                this.updateLikeDislikeCount(targetUserId);
        }
    }

    public async getAddressOfUser(user: User, ignoreOldAddress: boolean = false): Promise<string | null> {
        if (user.address && !ignoreOldAddress) return user.address;
        if (!user.latitude || !user.longitude) return null;

        try {
            const address = await this.getAddress(user.latitude.toString(), user.longitude.toString());

            if (address) {
                prisma.user.update({
                    where: { id: user.id },
                    data: { address }
                })

                return address;
            }
            return null;
        } catch (error) {
            logger(error);
            return null;
        }
    }

    public async getAddress(latitude: string, longitude: string): Promise<string | null> {
        if (!latitude || !longitude) return null;
        const redisKey = `getAddress:${latitude},${longitude}`;

        try {
            return await new Promise<string>((res, rej) => {
                redis.get(redisKey, (error, result) => {
                    if (result) {
                        res(result);
                    } else {
                        rej(error);
                    }
                })
            })
        } catch (_) {
            try {
                const res = await new Promise<request.Response>((resolve, reject) => {
                    const url = `https://us1.locationiq.com/v1/reverse.php?key=${process.env.LOCATIONIQ_TOKEN}&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=vi&format=json`;
                    request.get({
                        url,
                        callback: (e, res) => {
                            if (e) {
                                reject(e);
                            } else {
                                resolve(res);
                            }
                        }
                    })
                });

                if (res.statusCode != 200) throw new Error(res.body);

                const decoded = JSON.parse(res.body);
                const address = decoded.address;
                const addressField: string[] = [address['city'], address['county'], address['state'], address['country']].filter(e => e !== null);

                redis.setex(redisKey, 86400, addressField.join(', '));

                return addressField.join(', ');
            } catch (error) {
                // logger(error);
                return null;
            }
        }
    }

    /**
     * Function này không cần thiết phải đợi nó hoàn thành, vì nó thường là 
     * cập nhật của user khác không phải của user đang đăng nhập nên dữ liệu 
     * thay đổi không cần thiết phải ngay lập tức.
     */
    public async updateLikeDislikeCount(userId: string, options: { ignoreLike?: boolean, ignoreDislike?: boolean } = { ignoreDislike: false, ignoreLike: false }) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                ...(!options.ignoreLike ? { likeCount: await prisma.friend.count({ where: { receiverId: userId } }) } : {}),
                ...(!options.ignoreDislike ? { dislikeCount: await prisma.dislikedUser.count({ where: { dislikedUserId: userId } }) } : {}),
            }
        });
    }

    /**
     * return Path of json file
     */
    public async export(user: User & { role: Role }): Promise<{
        id: string,
        nickname: string,
        introduction?: string,
        age?: number,
        gender?: number,
        height?: number,
        x?: number,
        y?: number,
        smoking?: number,
        drinking?: number,
        yourKids?: number,
        religious?: number,
        hobbies: string[],
    }[]> {
        AuthService.authorizeUser(user, { values: [Permission.user.export] });

        const json = await prisma.user.findMany({
            include: {
                hobbies: true,
            }
        });

        return json.map(e => ({
            id: e.id,
            nickname: e.nickName ?? '',
            introduction: e.introduction ?? '',
            age: calculateAge(e.birthday) ?? -1,
            gender: Object.values(Gender).indexOf(e.gender),
            height: e.height,
            x: e.latitude,
            y: e.longitude,
            smoking: Object.values(UsualType).indexOf(e.smoking),
            drinking: Object.values(UsualType).indexOf(e.drinking),
            yourKids: Object.values(HaveKids).indexOf(e.yourKids),
            religious: Object.values(Religious).indexOf(e.religious),
            hobbies: e.hobbies.map(h => h.value),
        }));
    }
}

const _ = new UserService();
export { _ as UserService };
