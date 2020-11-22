import { arg, idArg, intArg, mutationField, stringArg } from "@nexus/schema";
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
                ...args.attachments ? {
                    attachments: await Promise.all(args.attachments)
                } : {}
            });
        }
    }
)