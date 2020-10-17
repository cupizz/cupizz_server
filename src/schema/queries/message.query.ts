import { idArg, intArg, objectType, queryField, stringArg } from "@nexus/schema";
import { Message } from "@prisma/client";
import { ForbiddenError } from "apollo-server-express";
import { Config } from "../../config";
import Strings from "../../constants/strings";
import { prisma } from "../../server";
import { AuthService, MessageService } from "../../service";

export const MyConversationsQuery = queryField('myConversations', {
    type: 'Conversation',
    list: true,
    resolve: async (_root, _args, ctx, _info) => {
        AuthService.authenticate(ctx);
        return await prisma.conversation.findMany({
            where: { members: { some: { userId: ctx.user.id } } },
            orderBy: { updatedAt: 'desc' }
        })
    }
})

export const conversationQuery = queryField('conversation', {
    type: 'Conversation',
    description: 'Truyền 1 trong 2: conversationId hoặc otherUserId',
    args: {
        conversationId: idArg(),
        otherUserId: idArg(),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        if(!args.conversationId && !args.otherUserId) {
            throw new Error("Please provide conversationId or otherUserId.")
        }

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
            return await MessageService.getConversation(ctx, args.otherUserId);
        }

    }
})

export const messagesQuery = queryField('messages', {
    type: objectType({
        name: 'MessagesOutput',
        definition(t) {
            t.field('data', { type: 'Message', list: true, nullable: false })
            t.field('currentPage', { type: 'Int', nullable: false })
        }
    }),
    args: {
        conversationId: stringArg({ nullable: false }),
        page: intArg(),
        focusMessageId: stringArg({ description: 'Nếu arg này tồn tại thì arg page ko có tác dụng' })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const pageSize = Config.defaultPageSize.value;
        let messages: Message[] = [];
        let currentPage = args.page ?? 1;
        let focusMessage = !args.focusMessageId
            ? null : await prisma.message.findOne({ where: { id: args.focusMessageId } });

        if (focusMessage) {
            const beforeFocusMessageCount = await prisma.message.count({
                where: { createdAt: { gt: focusMessage.createdAt } },
                orderBy: { createdAt: 'desc' }
            });

            currentPage = Math.ceil((beforeFocusMessageCount + 1) / pageSize);
        }

        messages = await prisma.message.findMany({
            where: { conversationId: args.conversationId },
            orderBy: { createdAt: 'desc' },
            take: pageSize,
            skip: pageSize * (currentPage - 1)
        })

        return { data: messages, currentPage };
    }
})