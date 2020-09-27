
import { ResultValue } from '@nexus/schema/dist/core';
import { Friend, OnlineStatus, User } from '@prisma/client';
import { AuthService } from '.';
import { Config } from '../config';
import SubscriptionKey from '../constants/subscriptionKey';
import { ErrorEmailExisted, ErrorEmailNotFound, ErrorIncorrectPassword, ErrorOtpIncorrect, ErrorTokenIncorrect, ValidationError } from '../model/error';
import { JwtAuthPayload } from '../model/jwtPayload';
import { JwtRegisterPayload } from '../model/registerPayload';
import { DefaultRole } from '../model/role';
import { FriendStatusEnum } from '../schema/types';
import { prisma, pubsub } from '../server';
import { logger } from '../utils/logger';
import OtpHandler from '../utils/otpHandler';
import { PasswordHandler } from '../utils/passwordHandler';
import { Validator } from '../utils/validator';

class UserService {
    public async authenticate(email: string, password: string): Promise<{ token: string, info: User }> {
        Validator.email(email);
        Validator.password(password);
        let user = (await prisma.socialProvider.findOne({
            where: {
                id_type: {
                    id: email,
                    type: 'email'
                }
            }, include: { user: true }
        }))?.user;

        if (user) {
            if (!PasswordHandler.compare(password, user.password)) {
                throw ErrorIncorrectPassword;
            }
            this.updateOnlineStatus(user);

            return {
                token: AuthService.sign({ userId: user.id } as JwtAuthPayload),
                info: user
            };
        }
        throw ErrorEmailNotFound;
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

        return AuthService.sign(registerPayload, Config.registerExpireTime);
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
}



const _ = new UserService();
export { _ as UserService };
