import { idArg, intArg, objectType, queryField, stringArg } from "@nexus/schema";
import { ObjectDefinitionBlock } from "@nexus/schema/dist/core";
import { ForbiddenError } from "apollo-server-express";
import assert from "assert";
import { Config, ConstConfig } from "../../config";
import Strings from "../../constants/strings";
import { prisma } from "../../server";
import { AuthService, MessageService } from "../../service";
import { Validator } from "../../utils/validator";

export const messageSimpleQuery = (t: ObjectDefinitionBlock<'Query'>) => {
    t.field('callConnectTimeOut', {
        type: 'Int',
        resolve: () => 15000
    })
    t.field('callRingingTimeOut', {
        type: 'Int',
        resolve: () => ConstConfig.callRingingTime,
    })
    t.crud.message({
        async resolve(root, args, ctx, info, origin) {
            const message: any = await origin(root, args, ctx, info);
            await MessageService.isMemberOfConversation(ctx, message?.conversationId);
            return message;
        }
    })
}

export const MyAnonymousChatQuery = queryField('myAnonymousChat', {
    type: 'Conversation',
    resolve: async (_root, _args, ctx, _info) => {
        AuthService.authenticate(ctx);
        return await MessageService.getAnonymousChat(ctx.user.id);
    }
})

export const MyConversationsQuery = queryField('myConversations', {
    type: objectType({
        name: 'MyConversationOutput',
        definition(t) {
            t.field('data', { type: 'Conversation', list: true })
            t.field('isLastPage', { type: 'Boolean' })
        }
    }),
    args: {
        page: intArg()
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const pageSize: number = Config.defaultPageSize?.value || 10;
        const data = await prisma.conversation.findMany({
            where: {
                members: { some: { userId: ctx.user.id } },
                isHidden: { equals: false },
                isAnonymousChat: { equals: false },
            },
            orderBy: { updatedAt: 'desc' },
            take: pageSize,
            skip: pageSize * ((args.page ?? 1) - 1)
        });
        return { data, isLastPage: data.length < pageSize }
    }
})

export const conversationQuery = queryField('conversation', {
    type: 'Conversation',
    args: {
        conversationId: stringArg(),
        userId: idArg()
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        assert(args.conversationId || args.userId, Strings.error.mustHaveConversationIdOrUserId);

        if (args.conversationId) {
            const conversation = await prisma.conversation.findOne({
                where: { id: args.conversationId },
                include: { members: true }
            })

            if (!conversation.members.map(e => e.userId).includes(ctx.user.id)) {
                throw new ForbiddenError(Strings.error.unAuthorize);
            }

            return conversation;
        } else {
            return await MessageService.getConversation(ctx, { otherUserId: args.userId });
        }
    }
})

export const messagesQuery = queryField('messages', {
    type: objectType({
        name: 'MessagesOutput',
        definition(t) {
            t.field('data', { type: 'Message', list: true, nullable: false })
            t.field('currentPage', { type: 'Int', nullable: false })
            t.field('isLastPage', { type: 'Boolean', nullable: false })
        }
    }),
    args: {
        conversationId: stringArg(),
        userId: idArg(),
        page: intArg(),
        focusMessageId: stringArg({ description: 'Nếu arg này tồn tại thì arg page ko có tác dụng' })
    },
    resolve: async (_root, args, ctx, _info) => {
        return await MessageService.getMessages(
            ctx,
            { conversationId: args.conversationId, otherUserId: args.userId },
            args.page,
            args.focusMessageId,
        );
    }
})

export const messagesV2Query = queryField('messagesV2', {
    type: objectType({
        name: 'MessagesOutputV2',
        definition(t) {
            t.field('data', { type: 'Message', list: true, nullable: false })
            t.field('isLastPage', { type: 'Boolean', nullable: false })
        }
    }),
    args: {
        conversationId: stringArg(),
        userId: idArg(),
        cursor: stringArg(),
        take: intArg({ default: 20 }),
        skip: intArg(),
        focusMessageId: stringArg({ description: 'Nếu arg này tồn tại thì arg cursor ko có tác dụng' }),
    },
    resolve: async (_root, args, ctx, _info) => {
        Validator.maxPagination(args.take)
        return await MessageService.getMessagesV2(
            ctx,
            { conversationId: args.conversationId, otherUserId: args.userId },
            args.cursor,
            args.take,
            args.skip,
            args.focusMessageId,
        );
    }
})