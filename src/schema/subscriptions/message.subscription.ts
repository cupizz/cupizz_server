import { intArg, subscriptionField } from "@nexus/schema";
import { withFilter } from "apollo-server-express";
import SubscriptionKey from "../../constants/subscriptionKey";
import { pubsub } from "../../server";
import { AuthService } from "../../service";

export const MessageSubscription = subscriptionField(
    "newMessage",
    {
        type: 'Message',
        description: 'Nếu không truyền vào người gửi thì sẽ nhận tất cả tin nhắn từ bất kì bạn bè nào gửi tới',
        args: {
            senderId: intArg({ nullable: true })
        },
        subscribe: withFilter(
            (_root, _args, ctx, _info) => {
                AuthService.authenticate(ctx);
                return pubsub.asyncIterator(SubscriptionKey.newMessage);
            },
            (root, args, ctx, _info) => {
                return args.senderId ? args.senderId === root.senderId : root.receiverId === ctx.user.id
            }
        ),
        resolve: (payload) => {
            return payload;
        },
    }
)