import { arg, enumType, intArg, objectType, queryField, stringArg } from "nexus";
import { Config } from "../../config";
import { ErrorNotFound } from "../../model/error";
import { prisma } from "../../server";
import { AuthService } from "../../service";
import { FriendService } from "../../service/friend.service";
import { RecommendService } from "../../service/recommend.service";

export const MeQuery = queryField('me', {
    type: 'User',
    resolve: (_root, _args, ctx, _info) => {
        AuthService.authenticate(ctx);
        return ctx.user;
    }
})

export const userQuery = queryField('user', {
    type: 'User',
    args: {
        id: stringArg({ required: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const user = await prisma.user.findUnique({ where: { id: args.id } });
        if (!user) {
            throw ErrorNotFound('Không tìm thấy người dùng');
        }
        return user;
    }
})

export const NotOfflineFriendsQuery = queryField('notOfflineFriends', {
    type: 'OnlineUserOutput',
    list: true,
    resolve: async (_root, _args, ctx, _info) => {
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

export const FriendsV2Query = queryField('friendsV2', {
    type: objectType({
        name: 'FriendsQueryOutputV2',
        definition(t) {
            t.field('data', { type: 'FriendDataType', list: true })
            t.boolean('isLastPage')
        }
    }),
    args: {
        type: arg({ type: 'FriendTypeEnumInput' }),
        orderBy: arg({ type: 'FriendSortEnumInput' }),
        page: intArg({ nullable: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const pageSize = Config.defaultPageSize.value;
        let data = [];

        switch (args.orderBy) {
            case 'login':
                data = await FriendService.getFriendsSortLogin(ctx, args.type, args.page, pageSize);
                break;
            case 'age':
                data = await FriendService.getFriendsSortAge(ctx, args.type, args.page, pageSize);
                break;
            default:
                data = await FriendService.getFriendsSortNew(ctx, args.type, args.page, pageSize);
                break;
        }

        return { data, isLastPage: data.length < pageSize }
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