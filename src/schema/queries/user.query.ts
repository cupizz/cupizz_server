import { booleanArg, enumType, intArg, queryField, } from "@nexus/schema";
import { Config } from "../../config";
import { prisma } from "../../server";
import { AuthService } from "../../service";
import { FriendWhereInput } from '@prisma/client'

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
        isSuperLike: booleanArg({ nullable: true, description: 'Nếu không truyền sẽ lấy cả 2' }),
        page: intArg({ nullable: true })
    },
    resolve: async (root, args, ctx, info) => {
        AuthService.authenticate(ctx);
        const pageSize = Config.defaultPageSize;
        let where: FriendWhereInput;

        switch (args.type) {
            case 'all':
                where = {
                    OR: [
                        { senderId: { equals: ctx.user.id } },
                        { receiverId: { equals: ctx.user.id } },
                    ],
                };
                break;
            case 'friend':
                where = {
                    OR: [
                        { senderId: { equals: ctx.user.id } },
                        { receiverId: { equals: ctx.user.id } },
                    ],
                    NOT: [{ acceptedAt: null }]
                }
                break;
            case 'received':
                where = {
                    receiverId: { equals: ctx.user.id },
                    acceptedAt: null
                }
                break;
            case 'sent':
                where = {
                    senderId: { equals: ctx.user.id },
                    acceptedAt: null
                }
                break;
        }

        return prisma.friend.findMany({
            where,
            take: pageSize,
            skip: pageSize * (args.page ?? 0)
        })
    }
})