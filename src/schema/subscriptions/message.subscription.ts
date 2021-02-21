import { booleanArg, idArg, stringArg, subscriptionField } from "@nexus/schema";
import { Conversation, Message } from "@prisma/client";
import { withFilter } from "apollo-server-express";
import assert from "assert";
import SubscriptionKey from "../../constants/subscriptionKey";
import { Context } from "../../context";
import { prisma, pubsub } from "../../server";
import { AuthService } from "../../service";
import { MessageService } from "../../service/message.service";
import { withCancel } from "../../utils/helper";

export const callSubscription = subscriptionField(
    'call',
    {
        type: 'Message',
        args: {
            conversationId: idArg(),
            receiverId: idArg(),
            isDev: booleanArg(),
        },
        subscribe: async (root, args, ctx: Context & { message: Message }, info) => {
            AuthService.authenticate(ctx);

            ctx.message = await MessageService.call(ctx, args);

            return withCancel((withFilter(
                (_root, _args, _ctx, _info) => {
                    setTimeout(() => {
                        ctx.pubsub.publish(SubscriptionKey.call, ctx.message);
                    }, 100);
                    return pubsub.asyncIterator(SubscriptionKey.call);
                },
                (root: Message, _args, ctx, _info) => {
                    return root.id == ctx.message.id;
                }
            ))(root, args, ctx, info), async () => {
                await MessageService.endCall(ctx, ctx.message.id, args.isDev)
            });
        },
        resolve: root => root,
    }
)

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

export const MessageChangeSubscription = subscriptionField(
    "messageChange",
    {
        type: 'Message',
        args: {
            conversationId: idArg(),
            senderId: idArg()
        },
        subscribe: (root, args, ctx, info) => withCancel((withFilter(
            (_root, _args, ctx: Context, _info) => {
                assert(args.senderId || args.conversationId)
                AuthService.authenticate(ctx);
                MessageService.updateInChatStatus(ctx, {
                    conversationId: args.conversationId,
                    otherUserId: args.senderId
                }, true);
                return pubsub.asyncIterator(SubscriptionKey.messageChange);
            },
            async (root: Message, args, ctx, _info) => {
                return (args.conversationId
                    ? root.conversationId === args.conversationId
                    : (args.senderId ? args.senderId === root.senderId || ctx.user.id === root.senderId : true))
                    && !!await prisma.conversationMember.findOne({
                        where: {
                            conversationId_userId: {
                                conversationId: root.conversationId,
                                userId: ctx.user.id
                            }
                        }
                    })
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
                return !root.isAnonymousChat && !!(await prisma.conversationMember.findOne({
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

export const findAnonymousChatSubscription = subscriptionField(
    "findAnonymousChat",
    {
        type: 'Conversation',
        subscribe: (root, args, ctx, info) => withCancel((withFilter(
            (_root, _args, ctx, _info) => {
                AuthService.authenticate(ctx);
                prisma.user.update({
                    where: { id: ctx.user.id },
                    data: { isFindingAnonymousChat: true }
                }).then(() => {
                    MessageService.findAndCreateAnonymousChat(ctx);
                })
                return pubsub.asyncIterator(SubscriptionKey.findAnonymousChat);
            },
            async (root: Conversation, _args, ctx, _info) => {
                return root.isAnonymousChat && !!(await prisma.conversationMember.findOne({
                    where: {
                        conversationId_userId: {
                            conversationId: root.id,
                            userId: ctx.user.id
                        }
                    }
                }));
            }
        ))(root, args, ctx, info), async () => {
            await prisma.user.update({
                where: { id: ctx.user.id },
                data: { isFindingAnonymousChat: false }
            })
        }),
        resolve: (payload) => {
            return payload;
        },
    }
)