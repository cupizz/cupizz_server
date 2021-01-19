import { Conversation, ConversationInclude, FileCreateInput, Message } from '@prisma/client';
import { ForbiddenError } from 'apollo-server-express';
import assert from 'assert';
import { FileUpload } from 'graphql-upload';
import { NotificationService } from '.';
import { Config } from '../config';
import Strings from '../constants/strings';
import SubscriptionKey from '../constants/subscriptionKey';
import { Context } from '../context';
import { ClientError, ErrorNotFound } from '../model/error';
import { prisma } from '../server';
import { logger } from '../utils/logger';
import { AuthService } from './auth.service';
import { FileService } from './file.service';

class MessageService {
    public async getConversation(ctx: Context, id: { otherUserId?: string, conversationId?: string }, include?: ConversationInclude) {
        AuthService.authenticate(ctx);
        assert(id.conversationId != null || id.otherUserId != null, Strings.error.mustHaveConversationIdOrUserId);
        const memberIds = [ctx.user.id, ...(ctx.user.id !== id.otherUserId && id.otherUserId ? [id.otherUserId] : [])];
        let conversation: Conversation;

        if (id.conversationId) {
            conversation = await prisma.conversation.findOne({ where: { id: id.conversationId } });
            if (!conversation) {
                throw ErrorNotFound('Conversation is notfound');
            }
        } else {
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
                try {
                    conversation = await this._createConversation(memberIds, include);
                } catch (error) {
                    if (!(await prisma.user.findOne({ where: { id: id.otherUserId } }))) {
                        throw ErrorNotFound("Không tìm thấy tài khoản.");
                    }
                }
            }
        }

        if (!conversation) throw new Error("Đã xảy ra lỗi");

        return conversation;
    }

    public async searchConversation(ctx: Context, keyword: string, page?: number)
        : Promise<{ data: (Conversation & { messages: Message[] })[], isLastPage: boolean }> {
        AuthService.authenticate(ctx);
        const pageSize: number = Config.defaultPageSize.value || 10;
        const data = await prisma.conversation.findMany({
            where: {
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
        getNewer: boolean = false,
        focusMessageId?: string
    ): Promise<{ data: Message[], isLastPage: boolean }> {
        assert(id.otherUserId || id.conversationId, Strings.error.mustHaveConversationIdOrUserId)
        AuthService.authenticate(ctx);

        const pageSize = 20;
        let messages: Message[] = [];
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
            // Lấy ra tin nhắn làm cursor
            const beforeFocusMessage = await prisma.message.findMany({
                where: { createdAt: { gt: focusMessage.createdAt } },
                orderBy: { createdAt: 'asc' },
                take: Math.round(pageSize / 2),
            });

            cursor = beforeFocusMessage.pop().id ?? cursor;
            getNewer = false;
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
            take: (pageSize + 1) * (getNewer ? -1 : 1),
            skip: 1
        })

        const isLastPage = getNewer ? false : messages.length <= pageSize;

        return { data: messages.splice(0, pageSize), isLastPage };
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

        const res = (await prisma.conversationMember.update({
            where: { conversationId_userId: { conversationId: conversation.id, userId: ctx.user.id } },
            data: {
                lastReadMessage: {
                    create: {
                        message: data.message,
                        sender: { connect: { id: ctx.user.id } },
                        conversation: { connect: { id: conversation.id } },
                        attachments: { create: files },
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

        await this._updateUnreadMessageCount(conversation.id);

        NotificationService.sendNewMessageNofity(conversation.id, res.id);

        ctx.pubsub.publish(SubscriptionKey.newMessage, res);
        prisma.conversation.findOne({ where: { id: conversation.id } }).then((v) => {
            ctx.pubsub.publish(SubscriptionKey.conversationChange, v);
        })

        return res;
    }

    public async canSendChat(ctx: Context, conversationId: string, throwError: boolean = true): Promise<Boolean> {
        let result = true;
        // result = AuthService.authorize(ctx, { values: [Permission.chat.create] }, throwError);

        if (result) {
            const member = await prisma.conversationMember.findOne({
                where: {
                    conversationId_userId: {
                        conversationId,
                        userId: ctx.user.id
                    }
                }
            });

            if (!member) {
                if (throwError) {
                    throw ClientError(Strings.error.cannotSendMessageToThisConversation);
                }
                result = false;
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
            })
            const members = (await prisma.conversationMember.update({
                where: { conversationId_userId: { userId: ctx.user.id, conversationId: conversation.id } },
                data: { isCurrentlyInChat: isInChat },
                include: { conversation: { include: { members: true } } }
            })).conversation.members.filter(e => e.userId != ctx.user.id);

            if (isInChat) logger(`User ${ctx.user.id} is in chat ${conversation.id}.`)
            else logger(`User ${ctx.user.id} is out chat ${conversation.id}.`)
        }
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
}

const _ = new MessageService();
export { _ as MessageService };
