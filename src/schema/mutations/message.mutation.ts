import { arg, intArg, mutationField, mutationType, stringArg } from "@nexus/schema";
import SubscriptionKey from "../../constants/subscriptionKey";
import { AuthService } from "../../service";

export const CreateMessageMutation = mutationField(
    'createMessage',
    {
        type: 'Message',
        args: {
            message: stringArg({ nullable: false }),
            receiverId: intArg({ nullable: false }),
            attachment: arg({ type: 'Upload', list: true, nullable: true })
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authenticate(ctx);
            // TODO authorize the user can message the other
            // TODO create attachment
            // TODO notification to other

            const res = await ctx.prisma.message.create({
                data: {
                    message: args.message,
                    sender: { connect: { id: ctx.user.id } },
                    receiver: { connect: { id: args.receiverId } },
                },
                include: {
                    sender: true,
                    receiver: true,
                    messageAttachment: true
                }
            });

            // TODO Nếu gửi được tin nhắn cho client bằng realtime thì đánh dấu là đã đọc, không thì gửi thông báo
            await ctx.pubsub.publish(SubscriptionKey.newMessage, res);

            return res;
        }
    }
)