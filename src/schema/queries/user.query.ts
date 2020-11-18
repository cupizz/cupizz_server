import { booleanArg, enumType, intArg, queryField, } from "@nexus/schema";
import { Config } from "../../config";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";
import { FriendWhereInput } from '@prisma/client'
import { RecommendService } from "../../service/recommend.service";
import { FriendService } from "../../service/friend.service";

export const MeQuery = queryField('me', {
    type: 'User',
    resolve: (root, args, ctx, info) => {
        AuthService.authenticate(ctx);
        return ctx.user;
    }
})

export const NotOfflineFriendsQuery = queryField('notOfflineFriends', {
    type: 'OnlineUserOutput',
    list: true,
    resolve: async (root, args, ctx, info) => {
        AuthService.authenticate(ctx);
        return (await prisma.friend.findMany({
            where: {
                OR: [
                    { receiverId: ctx.user.id },
                    { senderId: ctx.user.id }
                ]
            },
            include: { receiver: true, sender: true }
        })).map(e => {
            const user = e.receiverId === ctx.user.id ? e.sender : e.receiver;
            return {
                status: user.onlineStatus,
                user: user
            }
        })
    }
})

export const FriendsQuery = queryField('friends', {
    type: 'FriendDataType',
    list: true,
    args: {
        type: enumType({ name: 'FriendTypeEnumInput', members: ['all', 'friend', 'sent', 'received'] }),
        orderBy: enumType({ name: 'FriendSortEnumInput', members: ['new', 'login', 'age'] }),
        page: intArg({ nullable: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const pageSize = Config.defaultPageSize.value;

        switch (args.orderBy) {
            case 'login':
                return await FriendService.getFriendsSortLogin(ctx, args.type, args.page, pageSize);
            case 'age':
                return await FriendService.getFriendsSortAge(ctx, args.type, args.page, pageSize);
            default:
                return await FriendService.getFriendsSortNew(ctx, args.type, args.page, pageSize);
        }
    }
})

export const RecommendableUsersQuery = queryField('recommendableUsers', {
    type: 'User',
    list: true,
    description: '[DONE]',
    resolve: async (_root, _args, ctx, _info) => {
        return await RecommendService.getRecommendableUsers(ctx);
    }
})