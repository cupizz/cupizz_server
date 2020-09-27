import { arg, booleanArg, intArg, mutationField, stringArg } from "@nexus/schema";
import Strings from "../../constants/strings";
import { ClientError } from "../../model/error";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";
import { SocialNetworkService } from "../../service/socialNetwork.service";
import { Validator } from "../../utils/validator";
import { FriendStatusEnum } from "../types";

export const UpdateProfileMutation = mutationField('updateProfile', {
    type: 'User',
    args: {
        nickname: stringArg(),
        introduction: stringArg(),
        gender: arg({ type: 'Gender' }),
        hobbies: stringArg({ list: true }),
        phoneNumber: stringArg(),
        job: stringArg(),
        height: intArg(),
        privateFields: arg({ type: 'PrivateFieldEnum', list: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        Validator.phoneNumber(args.phoneNumber);

        const user = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                ...args,
                hobbies: { set: args.hobbies },
                privateFields: { set: args.privateFields }
            }
        })
        return user;
    }
})

export const UpdateMySettingMutation = mutationField('updateMySetting', {
    type: 'User',
    args: {
        minAgePrefer: intArg(),
        maxAgePrefer: intArg(),
        minHeightPrefer: intArg(),
        maxHeightPrefer: intArg(),
        genderPrefer: arg({ type: 'Gender', list: true }),
        distancePrefer: intArg(),
        mustHaveFields: arg({ type: 'MustHaveEnum', list: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        const user = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                ...args,
                genderPrefer: { set: args.genderPrefer },
                mustHaveFields: { set: args.mustHaveFields }
            }
        })
        return user;
    }
})

export const ConnectSocialNetworkMutation = mutationField('connectSocialNetwork', {
    type: 'User',
    args: {
        type: arg({ type: 'SocialProviderEnumType', nullable: false }),
        accessToken: stringArg({ nullable: false }),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const socialData = await SocialNetworkService.login(args.type, args.accessToken);

        const currentSocial = await prisma.socialProvider.findOne({ where: { id_type: socialData } });
        if (currentSocial) {
            if (currentSocial.userId === ctx.user.id) {
                return ctx.user;
            } else {
                throw ClientError("Tài khoản mạng xã hội này đã được kết nối với một tài khoản khác.");
            }
        }

        const user = (await prisma.socialProvider.create({
            data: {
                ...socialData,
                user: { connect: { id: ctx.user.id } }
            },
            include: { user: true }
        })).user;

        return user;
    }
})

export const AddFriendMutation = mutationField('addFriend', {
    type: 'FriendType',
    args: {
        userId: stringArg({ nullable: false, description: 'Id của user muốn kết bạn' }),
        isSuperLike: booleanArg({ nullable: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authorize(ctx, { values: [Permission.friend.create] });

        const friendData = await UserService.getFriendStatus(ctx.user.id, args.userId);
        switch (friendData.status) {
            case FriendStatusEnum.me:
                throw ClientError(Strings.error.cannotDoOnYourself);
            case FriendStatusEnum.none:
                return {
                    status: 'sent',
                    data: await prisma.friend.create({
                        data: {
                            receiver: { connect: { id: args.userId } },
                            sender: { connect: { id: ctx.user.id } },
                            isSuperLike: args.isSuperLike
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
                                receiverId: ctx.user.id,
                                senderId: args.userId
                            }
                        },
                        data: { acceptedAt: new Date() }
                    })
                }
            case FriendStatusEnum.friend:
                throw new Error(Strings.error.youWereBothFriendOfEachOther);
        }
    }
})

export const AcceptFriendMutation = mutationField('removeFriend', {
    type: 'FriendType',
    args: {
        userId: stringArg({ nullable: false, description: 'Id của user muốn remove' })
    },
    resolve: async (root, args, ctx, info) => {
        AuthService.authorize(ctx, { values: [Permission.friend.create] });

        const friendData = await UserService.getFriendStatus(ctx.user.id, args.userId);
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
                                senderId: ctx.user.id,
                                receiverId: args.userId,
                            },
                            {
                                senderId: args.userId,
                                receiverId: ctx.user.id,
                            },
                        ]
                    }
                })
                return friendData;
        }
    }
})