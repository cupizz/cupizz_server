import { Conversation, ConversationInclude, ConversationMember, FileCreateInput, Message, User } from '@prisma/client';
import { ForbiddenError } from 'apollo-server-express';
import assert from 'assert';
import { FileUpload } from 'graphql-upload';
import { arraysEqual } from '../utils/helper';
import { NotificationService } from '.';
import { Config, ConstConfig } from '../config';
import Strings from '../constants/strings';
import SubscriptionKey from '../constants/subscriptionKey';
import { Context } from '../context';
import { ClientError, ErrorConversationNotFound, ErrorNotFound } from '../model/error';
import { prisma, pubsub } from '../server';
import { logger } from '../utils/logger';
import { AuthService } from './auth.service';
import { FileService } from './file.service';
import { Permission } from '../model/permission';
import { CallStatus } from '../schema/types';

type ConversationKey = { conversationId?: string, otherUserId?: string };

class MessageService {
    private static _creatingConversations: (string[])[] = [];
    private static _creatingAnonymousChats: (string[])[] = [];

    public async getConversation(ctx: Context, id: ConversationKey, include?: ConversationInclude) {
        AuthService.authenticate(ctx);
        assert(id.conversationId != null || id.otherUserId != null, Strings.error.mustHaveConversationIdOrUserId);
        const memberIds = [ctx.user.id, ...ctx.user.id !== id.otherUserId && id.otherUserId ? [id.otherUserId] : []];
        let conversation: Conversation & { members: ConversationMember[] };

        if (id.conversationId) {
            conversation = await prisma.conversation.findOne({ where: { id: id.conversationId }, include: { members: true } });
            if (!conversation) {
                throw ErrorConversationNotFound();
            }
        } else {
            do {
                if (MessageService._creatingConversations.filter((e) => arraysEqual(e, memberIds)).length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const conversations = await prisma.conversation.findMany({
                    where: {
                        members: {
                            every: { userId: { in: memberIds } },
                        }
                    },
                    include: { ...include, members: true }
                })
                conversation = conversations.length > 1 || memberIds.length > 1
                    ? conversations.find(e => e.members.length === memberIds.length)
                    : conversations.length < 1
                        ? null
                        : conversations[0]

                if (!conversation) {
                    if (MessageService._creatingConversations.filter((e) => arraysEqual(e, memberIds)).length === 0) {
                        try {
                            // Block creating conversation to make sure that can not create 2 conversations have same member at the time.
                            MessageService._creatingConversations.push(memberIds);
                            conversation = await prisma.conversation.create({
                                data: {
                                    members: {
                                        create: memberIds.map(e => ({
                                            user: { connect: { id: e } },
                                            isAdmin: true,
                                        })),
                                    }
                                },
                                include: { ...include, members: true }
                            })
                        } finally {
                            MessageService._creatingConversations
                                .filter((e) => arraysEqual(e, memberIds))
                                .map((_, i) => MessageService._creatingConversations.splice(i, 1))
                        }
                    }
                }
            } while (!conversation && MessageService._creatingConversations.filter((e) => arraysEqual(e, memberIds)).length > 0)
        }

        return conversation;
    }

    public async getAnonymousChat(userId: string) {
        return await prisma.conversation.findFirst({
            where: {
                isAnonymousChat: true,
                members: {
                    some: { userId }
                },
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    public async findAndCreateAnonymousChat(ctx: Context) {
        AuthService.authenticate(ctx);
        // Check if current user is in a anonymous chat.
        let conversation = await this.getAnonymousChat(ctx.user.id);
        if (!conversation) {
            // Find user that finding anonymous chat too and not in another anonymous chat
            const otherUser = await prisma.user.findFirst({
                where: {
                    id: { not: ctx.user.id },
                    isFindingAnonymousChat: true,
                    conversationMembers: {
                        every: { conversation: { isAnonymousChat: false } }
                    }
                }
            })

            // If have user create anonymous chat
            if (otherUser) {
                conversation = await this._createAnonymousChat(ctx.user.id, otherUser.id);
                await prisma.user.updateMany({
                    where: { id: { in: [ctx.user.id, otherUser.id] } },
                    data: { isFindingAnonymousChat: false }
                })
                NotificationService.sendNewAnonymousChat([ctx.user.id, otherUser.id]);
            }
        }

        if (conversation) {
            pubsub.publish(SubscriptionKey.findAnonymousChat, conversation);
        } else {
            NotificationService.sendSomeOneFindingAnonymousChat();
        }
    }

    public async searchConversation(ctx: Context, keyword: string, page?: number)
        : Promise<{ data: (Conversation & { messages: Message[] })[], isLastPage: boolean }> {
        AuthService.authenticate(ctx);
        const pageSize: number = Config.defaultPageSize.value || 10;
        const data = await prisma.conversation.findMany({
            where: {
                isAnonymousChat: false,
                messages: { some: { message: { contains: keyword } } },
                members: { some: { userId: { equals: ctx.user.id } } }
            },
            include: {
                messages: {
                    where: { message: { contains: keyword } },
                    take: 1
                }
            },
            take: pageSize,
            skip: pageSize * ((page ?? 1) - 1)
        });
        return { data, isLastPage: data.length < pageSize }
    }

    public async getMessages(
        ctx: Context,
        id: { conversationId?: string, otherUserId?: string },
        page: number = 1,
        focusMessageId?: string
    ): Promise<{ data: Message[], currentPage: number, isLastPage: boolean }> {
        assert(id.otherUserId || id.conversationId, Strings.error.mustHaveConversationIdOrUserId)
        AuthService.authenticate(ctx);

        const pageSize = 20;
        let messages: Message[] = [];
        let currentPage = page;
        let focusMessage = !focusMessageId
            ? null : await prisma.message.findOne({ where: { id: focusMessageId } });

        let conversation;
        if (id.conversationId) {
            conversation = await prisma.conversation.findOne({
                where: { id: id.conversationId },
                include: { members: true }
            })

            if (!conversation.members.map(e => e.userId).includes(ctx.user.id)) {
                throw new ForbiddenError(Strings.error.unAuthorize);
            }
        } else {
            conversation = await this.getConversation(ctx, { otherUserId: id.otherUserId });
        }

        if (focusMessage) {
            const beforeFocusMessageCount = await prisma.message.count({
                where: { createdAt: { gt: focusMessage.createdAt } },
                orderBy: { createdAt: 'desc' }
            });

            currentPage = Math.ceil((beforeFocusMessageCount + 1) / pageSize);
            await this._markAsReadMessage(ctx, focusMessage.id);
        } else {
            const newestMessageId = (await this.getNewestMessage(conversation.id))?.id;
            if (newestMessageId) {
                await this._markAsReadMessage(ctx, newestMessageId);
            }
        }

        messages = await prisma.message.findMany({
            where: { conversationId: conversation?.id },
            orderBy: { createdAt: 'desc' },
            take: pageSize + 1,
            skip: pageSize * (currentPage - 1)
        })

        const isLastPage = messages.length <= pageSize;

        return { data: messages.splice(0, pageSize), currentPage, isLastPage };
    }

    public async getMessagesV2(
        ctx: Context,
        id: { conversationId?: string, otherUserId?: string },
        cursor?: string,
        take?: number,
        skip?: number,
        focusMessageId?: string
    ): Promise<{ data: Message[], isLastPage: boolean }> {
        assert(id.otherUserId || id.conversationId, Strings.error.mustHaveConversationIdOrUserId)
        AuthService.authenticate(ctx);

        let messages: Message[] = [];
        let focusMessage = !focusMessageId
            ? null : await prisma.message.findOne({ where: { id: focusMessageId } });

        let conversation = await this.getConversation(ctx, id);

        if (focusMessage) {
            // Lấy ra tin nhắn làm cursor
            const beforeFocusMessage = await prisma.message.findMany({
                where: { createdAt: { gt: focusMessage.createdAt } },
                orderBy: { createdAt: 'asc' },
                take: Math.round(take / 2),
            });

            cursor = beforeFocusMessage.pop().id ?? cursor;
            await this._markAsReadMessage(ctx, focusMessage.id);
        } else {
            const newestMessageId = (await this.getNewestMessage(conversation.id))?.id;
            if (newestMessageId) {
                await this._markAsReadMessage(ctx, newestMessageId);
            }
        }

        messages = await prisma.message.findMany({
            where: { conversationId: conversation?.id },
            orderBy: { createdAt: 'desc' },
            cursor: cursor ? { id: cursor } : undefined,
            take, skip,
        })

        const isLastPage = messages.length < take;

        return { data: messages, isLastPage };
    }

    public async sendMessage(ctx: Context, data: {
        conversationId?: string,
        receiverId?: string,
        message?: string,
        attachments?: FileUpload[],
    }) {
        assert(data.conversationId !== null || data.receiverId !== null, Strings.error.mustHaveConversationIdOrUserId);
        assert(data.message?.length > 0 || data.attachments?.length > 0, Strings.error.contentMustBeNotEmpty);

        let conversation = data.conversationId
            ? await prisma.conversation.findOne({ where: { id: data.conversationId } })
            : await this.getConversation(ctx, { otherUserId: data.receiverId });
        if (!conversation) throw ErrorNotFound();

        await this.canSendChat(ctx, conversation.id)
        let files: FileCreateInput[] = [];
        if (data.attachments) {
            files = await FileService.uploadMulti(data.attachments)
        }

        return await this._sendMessage(ctx, {
            conversationId: conversation.id,
            message: data.message,
            attachments: files,
        });
    }

    public async call(ctx: Context, data: {
        conversationId?: string,
        receiverId?: string,
        isDev?: boolean,
    }) {
        assert(data.conversationId !== null || data.receiverId !== null, Strings.error.mustHaveConversationIdOrUserId);

        let conversation = data.conversationId
            ? await prisma.conversation.findOne({ where: { id: data.conversationId }, include: { members: true } })
            : await this.getConversation(ctx, { otherUserId: data.receiverId }, { members: true });
        if (!conversation) throw ErrorNotFound();

        await this.canSendChat(ctx, conversation.id)

        if (ctx.user.isInACall) {
            throw ClientError('You are in another call.');
        }

        // Get lasted call and finish it.
        // Use for ensure server don't have any incorrect call message.
        // So do not wait this function complete
        prisma.message.findFirst({
            where: {
                conversationId: conversation.id,
                isCallMessage: true,
                endedCallAt: { equals: null }
            },
            orderBy: { createdAt: 'desc' }
        }).then(lastedCall => {
            if (lastedCall && !lastedCall.endedCallAt) {
                prisma.message.update({
                    where: { id: lastedCall.id },
                    data: { endedCallAt: new Date() }
                })
            }
        })
        logger(`${ctx.user.id} call in conversation ${conversation.id}`)

        const message = await this._sendMessage(ctx, {
            conversationId: conversation.id,
            isCallMessage: true,
        });

        await prisma.$transaction(conversation.members
            .map(e => prisma.user.update({ where: { id: e.userId }, data: { isInACall: true } })));

        // End call if no one accept.
        setTimeout(async () => {
            const messageToEnd = await prisma.message.findOne({ where: { id: message.id } });
            if (messageToEnd && !messageToEnd.startedCallAt && !messageToEnd.endedCallAt) {
                await this.endCall(ctx, message.id, data.isDev);
                logger(`${ctx.user.id} called in conversation ${conversation.id} but no one accept`)
            }
        }, ConstConfig.callRingingTime);

        return message;
    }

    public async acceptCall(ctx: Context, messageId: string) {
        AuthService.authenticate(ctx);
        const message = await prisma.message.findOne({ where: { id: messageId } });
        await this.canUpdateCall(ctx, { message });
        if (message.startedCallAt) {
            throw ClientError('This call have started already');
        } else if (message.endedCallAt) {
            throw ClientError('This call have ended');
        }

        const newMessage = await prisma.message.update({
            where: { id: messageId },
            data: {
                startedCallAt: new Date(),
            },
            include: { conversation: true }
        })

        ctx.pubsub.publish(SubscriptionKey.call, newMessage);
        ctx.pubsub.publish(SubscriptionKey.messageChange, newMessage);
        ctx.pubsub.publish(SubscriptionKey.conversationChange, newMessage.conversation);
    }

    public async endCall(ctx: Context, messageId: string, isDev?: boolean) {
        AuthService.authenticate(ctx);
        const message = await prisma.message.findOne({
            where: { id: messageId },
            include: { conversation: { include: { members: true } } }
        });
        await this.canUpdateCall(ctx, { message });
        await this._endCall(message, ctx, isDev);
    }

    public getConversationName(currentUser: User, conversation: Conversation & { members: (ConversationMember & { user: User })[] }): string {
        return conversation.name || conversation.members
            .filter(e => e.userId !== currentUser.id)
            .join(', ') || 'Me';
    }

    public getCallStatus(currentUserId: string, message: Message): CallStatus {
        if (!message.isCallMessage) return null;
        if (!message.endedCallAt) {
            if (message.startedCallAt) {
                return 'inCall';
            } else {
                // Để sửa db trong trường hợp có cuộc gọi nào đó đỗ chuông hoài không dừng
                if (message.createdAt.getTime() + ConstConfig.callRingingTime + 1000 < new Date().getTime()) {
                    this._endCall(message);
                }
                return 'ringing';
            }
        } else {
            if (message.startedCallAt) {
                return 'ended';
            } else {
                if (message.endedById !== currentUserId) {
                    return 'rejected';
                } else {
                    return 'missing';
                }
            }
        }
    }

    public getCallMessage(currentUserId: string, message: Message): string {
        if (!message.isCallMessage) return message.message;

        const callStatus = this.getCallStatus(currentUserId, message);

        switch (callStatus) {
            case 'ended':
                const millis = message.endedCallAt.getTime() - message.startedCallAt.getTime();
                var minutes = Math.floor(millis / 60000);
                var seconds = (millis % 60000) / 1000;
                return 'Called in ' + minutes + ":" + (Math.round(seconds) < 10 ? '0' : '') + seconds.toFixed(0);
            case 'inCall':
                return 'In call';
            case 'missing':
                return 'Missing call';
            case 'rejected':
                return 'Rejected';
            case 'ringing':
                return 'Calling...'
            default:
                return message.message;
        }
    }

    public getCallRoomId(ctx: Context, message: Message): string {
        if (!message.isCallMessage || message.endedCallAt || !this.canUpdateCall(ctx, { message }, false))
            return null;

        return message.conversationId + '-' + message.id;
    }

    public async canSendChat(ctx: Context, conversationId: string, throwError: boolean = true): Promise<Boolean> {
        let result = false;
        result = AuthService.authorize(ctx, { values: [Permission.chat.create] }, throwError);

        if (result) {
            result = await this.isMemberOfConversation(ctx, conversationId, throwError);
        }
        return result;
    }

    public async isMemberOfConversation(ctx: Context, conversationId: string, throwError: boolean = true): Promise<boolean> {
        if (!AuthService.authenticate(ctx, throwError)) return false;

        const conversation = await prisma.conversation.findOne({
            where: { id: conversationId ?? "" },
            include: { members: true }
        })

        if (!conversation) {
            if (throwError) {
                throw ErrorConversationNotFound();
            }
            return false;
        }

        if (conversation.members.findIndex(e => e.userId === ctx.user.id) < 0) {
            if (throwError) {
                throw ClientError(Strings.error.cannotSendMessageToThisConversation);
            }
            return false;
        }

        return true;
    }

    public checkAvailableCallMessage(message: Message, throwError: boolean = true) {
        const result = message.isCallMessage && !message.endedCallAt;
        if (throwError && !result) {
            throw ClientError('This is not valid call.');
        }
        return result;
    }

    public async canUpdateCall(ctx: Context, messageData: { messageId?: string, message?: Message }, throwError: boolean = true): Promise<Boolean> {
        assert(messageData.messageId || messageData.message, 'Message notfound');
        const message = messageData.message || await prisma.message.findOne({ where: { id: messageData.messageId } });
        let result: boolean;
        if (!message) if (throwError) throw ErrorNotFound('Call not found'); else result = false;

        if (result) {
            result = await this.canSendChat(ctx, message.conversationId, throwError) && this.checkAvailableCallMessage(message, throwError);
            if (result) {
                if (ctx.user.isInACall) {
                    if (throwError) {
                        throw ClientError('You are in another call.');
                    }
                    result = false
                } else {
                    const members = await prisma.conversationMember.findMany({
                        where: {
                            conversationId: message.conversationId,
                            userId: { not: { equals: ctx.user.id } }
                        },
                        include: { user: true }
                    });

                    // Kiểm tra xem các member trong nhóm chat có rãnh để gọi hay ko
                    // Chỉ cần có 1 người khác người gọi đang rãnh là ok.
                    if (members.findIndex(e => !e.user.isInACall) < 0) {
                        if (throwError) {
                            throw ClientError('The partner is busy now.');
                        }
                        result = false
                    }
                }
            }
        }
        return result;
    }

    public async getNewestMessage(conversationId: string) {
        return await prisma.message.findFirst({
            where: { conversationId },
            orderBy: { createdAt: 'desc' }
        })
    }

    public async updateInChatStatus(ctx: Context, id: { conversationId?: string, otherUserId?: string }, isInChat: boolean) {
        AuthService.authenticate(ctx);
        if (!id.conversationId && !id.otherUserId) {
            await prisma.conversationMember.updateMany({
                where: {
                    userId: { equals: ctx.user.id },
                    isCurrentlyInChat: !isInChat,
                },
                data: {
                    isCurrentlyInChat: isInChat
                }
            })
            if (isInChat) logger(`User ${ctx.user.id} is in all chat.`)
            else logger(`User ${ctx.user.id} is out all chat.`)
        } else {
            const conversation = await this.getConversation(ctx, {
                conversationId: id.conversationId, otherUserId: id.otherUserId
            });
            (await prisma.conversationMember.update({
                where: { conversationId_userId: { userId: ctx.user.id, conversationId: conversation.id } },
                data: { isCurrentlyInChat: isInChat },
                include: { conversation: { include: { members: true } } }
            })).conversation.members.filter(e => e.userId != ctx.user.id);

            if (isInChat) logger(`User ${ctx.user.id} is in chat ${conversation.id}.`)
            else logger(`User ${ctx.user.id} is out chat ${conversation.id}.`)
        }
    }

    public async deleteConversation(ctx: Context, key: ConversationKey) {
        AuthService.authenticate(ctx);
        const conversation = await this.getConversation(ctx, key);

        if (!conversation) {
            throw ErrorNotFound();
        }

        if (!this.canSendChat(ctx, conversation.id, false)) {
            throw ClientError(Strings.error.canNotDeleteConversation);
        }

        if (conversation.members.findIndex(e => e.userId === ctx.user.id) < 0) {
            AuthService.authorize(ctx, { values: [Permission.chat.delete] })
        }

        return await this._deleteConversation(conversation.id);
    }

    private async _deleteConversation(conversationId: string) {
        await this._deleteAllMessage(conversationId);
        await prisma.conversationMember.deleteMany({ where: { conversationId } });
        return await prisma.conversation.delete({ where: { id: conversationId } })
    }

    private async _deleteAllMessage(conversationId: string) {
        await FileService.deleteFiles({
            where: { Message: { conversationId } }
        })
        return await prisma.message.deleteMany({
            where: { conversationId }
        })
    }

    private async _markAsReadMessage(ctx: Context, messageId: string) {
        AuthService.authenticate(ctx);
        const message = await prisma.message.findOne({
            where: { id: messageId },
        })
        const conversationMember = await prisma.conversationMember.findOne({
            where: {
                conversationId_userId: {
                    conversationId: message.conversationId,
                    userId: ctx.user.id
                }
            },
            include: { lastReadMessage: true }
        })

        if (conversationMember && (!conversationMember.lastReadMessage || conversationMember.lastReadMessage.createdAt < message.createdAt)) {
            // Cập nhật lại tin nhắn mới nhất đã đọc
            const conversation = (await prisma.conversationMember.update({
                where: {
                    conversationId_userId: {
                        conversationId: message.conversationId,
                        userId: ctx.user.id,
                    }
                },
                data: {
                    lastReadMessage: { connect: { id: messageId } },
                    unreadMessageCount: await this._getUnreadMessageCount(message.conversationId, ctx.user.id, message)
                },
                include: { conversation: true }
            })).conversation;

            await ctx.pubsub.publish(SubscriptionKey.conversationChange, conversation);
        }
    }

    private async _updateUnreadMessageCount(conversationId: string) {
        const members = await prisma.conversationMember.findMany({
            where: { conversationId },
            include: { lastReadMessage: true }
        });

        await Promise.all(members.map(async member => {
            await prisma.conversationMember.update({
                where: { conversationId_userId: { conversationId, userId: member.userId } },
                data: { unreadMessageCount: await this._getUnreadMessageCount(conversationId, member.userId, member.lastReadMessage) }
            })
        }))
    }

    private async _sendMessage(
        ctx: Context,
        data: {
            conversationId: string,
            message?: string,
            attachments?: FileCreateInput[],
            isCallMessage?: boolean,
        }
    ) {
        const res = (await prisma.conversationMember.update({
            where: { conversationId_userId: { conversationId: data.conversationId, userId: ctx.user.id } },
            data: {
                lastReadMessage: {
                    create: {
                        message: data.message,
                        sender: { connect: { id: ctx.user.id } },
                        conversation: { connect: { id: data.conversationId } },
                        attachments: { create: data.attachments },
                        isCallMessage: data.isCallMessage,
                    }
                },
                unreadMessageCount: 0,
                conversation: {
                    update: {
                        updatedAt: new Date(),
                        isHidden: false,
                    }
                }
            },
            include: { lastReadMessage: { include: { sender: true } } }
        })).lastReadMessage;

        await this._updateUnreadMessageCount(data.conversationId);

        if (!data.isCallMessage) {
            NotificationService.sendNewMessageNotify(data.conversationId, res.id);
        }

        ctx.pubsub.publish(SubscriptionKey.newMessage, res);
        ctx.pubsub.publish(SubscriptionKey.messageChange, res);
        prisma.conversation.findOne({ where: { id: data.conversationId } }).then((v) => {
            if (v) {
                ctx.pubsub.publish(SubscriptionKey.conversationChange, v);
            }
        })

        return res;
    }


    private async _getUnreadMessageCount(conversationId: string, userId: string, lastReadMessage?: Message) {
        const _lastReadMessage: Message = lastReadMessage
            || (await prisma.conversationMember.findOne({
                where: { conversationId_userId: { conversationId, userId } },
                include: { lastReadMessage: true }
            })).lastReadMessage;

        return await prisma.message.count({
            where: {
                conversationId,
                senderId: { not: userId },
                ...(_lastReadMessage ? { createdAt: { gt: _lastReadMessage.createdAt } } : {})
            }
        });
    }

    private static _blockingCreateConversation: boolean = false;
    private async _createConversation(memberIds: string[], include?: ConversationInclude) {
        while (MessageService._blockingCreateConversation) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        try {
            MessageService._blockingCreateConversation = true;
            return await prisma.conversation.create({
                data: {
                    members: {
                        create: memberIds.map(e => ({
                            user: { connect: { id: e } },
                            isAdmin: true,
                        })),
                    }
                },
                include: { ...include, members: true }
            })
        } finally {
            MessageService._blockingCreateConversation = false;
        }
    }

    private async _createAnonymousChat(userId: string, otherUserId: string) {
        if (await this.getAnonymousChat(userId) || await this.getAnonymousChat(otherUserId)) {
            throw ClientError('Can not create anonymous chat.');
        }

        const memberIds = [userId, otherUserId];
        let conversation: Conversation;

        do {
            if (MessageService._creatingAnonymousChats.filter((e) => arraysEqual(e, memberIds)).length > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            conversation = await prisma.conversation.findFirst({
                where: {
                    isAnonymousChat: true,
                    members: {
                        every: { userId: { in: memberIds } },
                    }
                }
            })

            if (!conversation) {
                if (MessageService._creatingAnonymousChats.filter((e) => arraysEqual(e, memberIds)).length === 0) {
                    try {
                        // Block creating conversation to make sure that can not create 2 conversations have same member at the time.
                        MessageService._creatingAnonymousChats.push(memberIds);
                        conversation = await prisma.conversation.create({
                            data: {
                                isAnonymousChat: true,
                                members: {
                                    create: memberIds.map(e => ({
                                        user: { connect: { id: e } },
                                        isAdmin: true,
                                    })),
                                }
                            },
                        })
                    } finally {
                        MessageService._creatingAnonymousChats
                            .filter((e) => arraysEqual(e, memberIds))
                            .map((_, i) => MessageService._creatingAnonymousChats.splice(i, 1))
                    }
                }
            }
        } while (!conversation && MessageService._creatingAnonymousChats.filter((e) => arraysEqual(e, memberIds)).length > 0)

        return conversation;
    }

    private async _endCall(message: Message, ctx?: Context, isDev?: boolean) {
        if (ctx) AuthService.authenticate(ctx);
        if (message.endedCallAt) return;

        const newMessage = await prisma.message.update({
            where: { id: message.id },
            data: {
                endedCallAt: new Date(),
                endedBy: ctx?.user ? { connect: { id: ctx.user.id } } : undefined,
            },
            include: { conversation: { include: { members: true } } }
        })

        await prisma.$transaction(newMessage.conversation.members
            .map(e => prisma.user.update({
                where: { id: e.userId },
                data: { isInACall: false }
            })))

        ctx.pubsub.publish(SubscriptionKey.call, newMessage);
        ctx.pubsub.publish(SubscriptionKey.messageChange, newMessage);
        ctx.pubsub.publish(SubscriptionKey.conversationChange, newMessage.conversation);
        logger(`Ended call ${message.id}` + (ctx.user.id ? ` by ${ctx.user.id}` : ''))
    }
}

const _ = new MessageService();
export { _ as MessageService };
