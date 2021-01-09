import { idArg, subscriptionField } from "@nexus/schema";
import { Conversation, Message } from "@prisma/client";
import { withFilter } from "apollo-server-express";
import SubscriptionKey from "../../constants/subscriptionKey";
import { Context } from "../../context";
import { prisma, pubsub } from "../../server";
import { AuthService } from "../../service";
import { MessageService } from "../../service/message.service";
import { withCancel } from "../../utils/helper";

export const MessageSubscription = subscriptionField(
    "newMessage",
    {
        type: 'Message',
        description: 'Nếu không truyền vào người gửi thì sẽ nhận tất cả tin nhắn từ bất kì bạn bè nào gửi tới',
        args: {
            conversationId: idArg(),
            senderId: idArg()
        },
        subscribe: (root, args, ctx, info) => withCancel((withFilter(
            (_root, _args, ctx: Context, _info) => {
                AuthService.authenticate(ctx);
                MessageService.updateInChatStatus(ctx, {
                    conversationId: args.conversationId,
                    otherUserId: args.senderId
                }, true);
                return pubsub.asyncIterator(SubscriptionKey.newMessage);
            },
            async (root: Message, args, ctx, _info) => {
                return (args.conversationId
                    ? root.conversationId === args.conversationId
                    : (args.senderId ? args.senderId === root.senderId || ctx.user.id === root.senderId : true))
                    && !!(await prisma.conversationMember.findOne({
                        where: {
                            conversationId_userId: {
                                conversationId: root.conversationId,
                                userId: ctx.user.id
                            }
                        }
                    }));
            }
        ))(root, args, ctx, info), () => {
            MessageService.updateInChatStatus(ctx, {
                conversationId: args.conversationId,
                otherUserId: args.senderId
            }, false);
        }),
        resolve: (payload) => {
            return payload;
        },
    }
)

export const ConversationChangeSubscription = subscriptionField(
    "conversationChange",
    {
        type: 'Conversation',
        subscribe: (root, args, ctx, info) => withCancel((withFilter(
            (_root, _args, ctx, _info) => {
                AuthService.authenticate(ctx);
                // MessageService.updateInChatStatus(ctx, {}, true);
                return pubsub.asyncIterator(SubscriptionKey.conversationChange);
            },
            async (root: Conversation, _args, ctx, _info) => {
                return !!(await prisma.conversationMember.findOne({
                    where: {
                        conversationId_userId: {
                            conversationId: root.id,
                            userId: ctx.user.id
                        }
                    }
                }));
            }
        ))(root, args, ctx, info), () => {
            // MessageService.updateInChatStatus(ctx, {}, false);
        }),
        resolve: (payload) => {
            return payload;
        },
    }
)