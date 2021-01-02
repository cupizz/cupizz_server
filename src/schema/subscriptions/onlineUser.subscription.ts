import { objectType, subscriptionField } from "nexus";
import { withFilter } from "apollo-server-express";
import SubscriptionKey from "../../constants/subscriptionKey";
import { pubsub } from "../../server";
import { AuthService, UserService } from "../../service";
import { FriendStatusEnum, OnlineStatusEnumType } from "../types";

export const OnlineUserSubscription = subscriptionField(
    "onlineFriend",
    {
        type: objectType({
            name: 'OnlineUserOutput',
            definition(t) {
                t.field('status', { type: OnlineStatusEnumType, nullable: false })
                t.field('user', { type: 'User', nullable: false })
            }
        }),
        description: 'Nhận được trạng thái online của bạn bè, khi có thay đổi',
        subscribe: withFilter(
            (_root, _args, ctx, _info) => {
                AuthService.authenticate(ctx);
                return pubsub.asyncIterator(SubscriptionKey.onlineFriend);
            },
            async (root, _args, ctx, _info) => {
                return (await UserService.getFriendStatus(ctx.user.id, root.user.id)).status === FriendStatusEnum.friend
            }
        ),
        resolve: (payload) => {
            return payload;
        },
    }
)