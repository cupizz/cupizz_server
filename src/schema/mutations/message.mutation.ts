import { arg, idArg, mutationField, stringArg } from "@nexus/schema";
import { NotificationService } from "src/service";
import { prisma } from "../../server";
import { MessageService } from "../../service/message.service";

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
            await MessageService.deleteConversation(ctx, conversation.id)
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