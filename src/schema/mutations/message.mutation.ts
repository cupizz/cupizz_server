import { arg, booleanArg, idArg, mutationField, stringArg } from "@nexus/schema";
import { NotificationService } from "../../service";
import { prisma } from "../../server";
import { MessageService } from "../../service/message.service";

export const acceptCallMutation = mutationField(
    'acceptCall',
    {
        type: 'Boolean',
        args: {
            messageId: stringArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            await MessageService.acceptCall(ctx, args.messageId);
            return true;
        }
    }
)

export const endCallMutation = mutationField(
    'endCall',
    {
        type: 'Boolean',
        args: {
            messageId: stringArg({ required: true }),
            isDev: booleanArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            await MessageService.endCall(ctx, args.messageId, args.isDev);
            return true;
        }
    }
)

export const CreateMessageMutation = mutationField(
    'sendMessage',
    {
        type: 'Message',
        // description: 'Bắt buộc truyền vào `conversationId` hoặc `receiverId`',
        args: {
            conversationId: idArg(),
            receiverId: idArg(),
            message: stringArg(),
            attachments: arg({ type: 'Upload', list: true, nullable: true }),
        },
        resolve: async (_root, args, ctx, _info) => {
            return await MessageService.sendMessage(ctx, {
                ...args,
                ...(args.attachments ? {
                    attachments: await Promise.all(args.attachments)
                } : {})
            });
        }
    }
)

export const deleteAnonymousChat = mutationField(
    'deleteAnonymousChat',
    {
        type: 'Boolean',
        resolve: async (_root, _args, ctx, _info) => {
            const conversation = await MessageService.getAnonymousChat(ctx.user.id);
            const members = await prisma.conversationMember.findMany({
                where: { conversationId: conversation.id }
            })
            await MessageService.deleteConversation(ctx, { conversationId: conversation.id })
            await prisma.user.updateMany({
                where: { id: { in: members.map(e => e.userId) } },
                data: {
                    isFindingAnonymousChat: false,
                }
            })
            NotificationService.sendDeleteAnonymousChat(members
                .filter(e => e.userId !== ctx.user.id).map(e => e.userId));
            return true;
        }
    }
)

export const deleteConversationMutation = mutationField(
    'deleteConversation',
    {
        type: 'Boolean',
        args: {
            conversationId: stringArg(),
            receiverId: idArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            await MessageService.deleteConversation(
                ctx,
                {
                    conversationId: args.conversationId,
                    otherUserId: args.receiverId,
                },
            );

            return true;
        }
    }
)