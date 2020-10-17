
import { ResultValue } from '@nexus/schema/dist/core';
import { Friend, Gender, OnlineStatus, User, UserWhereInput } from '@prisma/client';
import { AuthService } from '.';
import { Config } from '../config';
import Strings from '../constants/strings';
import SubscriptionKey from '../constants/subscriptionKey';
import { ClientError, ErrorEmailExisted, ErrorOtpIncorrect, ErrorTokenIncorrect, ValidationError } from '../model/error';
import { JwtRegisterPayload } from '../model/registerPayload';
import { DefaultRole } from '../model/role';
import { NexusGenAllTypes } from '../schema/generated/nexus';
import { FriendStatusEnum } from '../schema/types';
import { prisma, pubsub } from '../server';
import { logger } from '../utils/logger';
import OtpHandler from '../utils/otpHandler';
import { PasswordHandler } from '../utils/passwordHandler';
import { Validator } from '../utils/validator';

class UserService {
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
                ...status ? { onlineStatus: status } : {}
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

    public async addFriend(currentUserId: string, otherUserId: string, isSuperLike: boolean = false): Promise<NexusGenAllTypes['FriendType']> {
        const friendData = await this.getFriendStatus(currentUserId, otherUserId);
        switch (friendData.status) {
            case FriendStatusEnum.me:
                throw ClientError(Strings.error.cannotDoOnYourself);
            case FriendStatusEnum.none:
                return {
                    status: 'sent',
                    data: await prisma.friend.create({
                        data: {
                            receiver: { connect: { id: otherUserId } },
                            sender: { connect: { id: currentUserId } },
                            isSuperLike: isSuperLike
                        }
                    })
                }
            case FriendStatusEnum.sent:
                throw ClientError(Strings.error.cannotAddFriendTwice);
            case FriendStatusEnum.received:
                return {
                    status: 'friend',
                    data: await prisma.friend.update({
                        where: {
                            senderId_receiverId: {
                                receiverId: currentUserId,
                                senderId: otherUserId
                            }
                        },
                        data: { acceptedAt: new Date() }
                    })
                }
            case FriendStatusEnum.friend:
                throw new Error(Strings.error.youWereBothFriendOfEachOther);
        }
    }

    public async removeFriend(currentUserId: string, otherUserId: string): Promise<NexusGenAllTypes['FriendType']> {
        const friendData = await this.getFriendStatus(currentUserId, otherUserId);
        switch (friendData.status) {
            case FriendStatusEnum.me:
                throw ClientError(Strings.error.cannotDoOnYourself);
            case FriendStatusEnum.none:
                throw ClientError(Strings.error.youWereBothNotFriendOfEachOther);
            default:
                await prisma.friend.deleteMany({
                    where: {
                        OR: [
                            {
                                senderId: currentUserId,
                                receiverId: otherUserId,
                            },
                            {
                                senderId: otherUserId,
                                receiverId: currentUserId,
                            },
                        ]
                    }
                })
                return friendData;
        }
    }

    public async generateRecommendableUsers(userId: string, saveToDb: boolean = true): Promise<User[]> {
        const user = await prisma.user.findOne({
            where: { id: userId },
            include: {
                senderFriend: true,
                receiverFriend: true,
                dislikedUsers: true,
            }
        });
        const friendIds: string[] = [];
        friendIds.push(
            ...user.senderFriend.map(e => e.receiverId),
            ...user.receiverFriend.map(e => e.senderId)
        );

        const now = new Date();
        const birthdayCondition: { min: Date, max: Date } =
        {
            min: new Date(now.getUTCFullYear() - (user.maxAgePrefer || Config.maxAge.value), 0, 1),
            max: new Date(now.getUTCFullYear() - (user.minAgePrefer || Config.minAge.value), 11, 31),
        };


        const where: UserWhereInput = {
            NOT: { OR: [userId, ...friendIds].map(e => ({ id: { equals: e } })) },
            birthday: { lte: birthdayCondition.max, gte: birthdayCondition.min },
            height: { lte: user.maxHeightPrefer || Config.maxHeight.value, gte: user.minHeightPrefer || Config.minHeight.value },
            gender: { in: user.genderPrefer.length > 0 ? user.genderPrefer : Object.values(Gender) },
            id: { notIn: user.dislikedUsers.map(e => e.dislikedUserId) },
            allowMatching: true,
            isPrivate: false,
            deletedAt: null,
        }

        const result = await prisma.user.findMany({ where, take: 20 });

        if (saveToDb) {
            let currentCount = 0;
            if (await prisma.recommendableUser.count({ where: { userId } }) > 0) {
                await prisma.recommendableUser.deleteMany({ where: { userId, sortOrder: { not: 1 } } });
                currentCount = 1;
            }

            await Promise.all(result.map(async (e, i) => await prisma.recommendableUser.create({
                data: {
                    user: { connect: { id: userId } },
                    sortOrder: i + currentCount + 1,
                    recommendableUser: { connect: { id: e.id } }
                }
            })))
        }

        return result;
    }
}



const _ = new UserService();
export { _ as UserService };
