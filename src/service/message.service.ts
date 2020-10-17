import { Context } from '../context';
import { prisma } from '../server';
import { ConversationInclude, FileCreateInput, Message } from '@prisma/client'
import { AuthService } from './auth.service';
import { Permission } from '../model/permission';
import { ClientError } from '../model/error';
import Strings from '../constants/strings';
import { FileUpload } from 'graphql-upload';
import { FileService } from './file.service';
import { OnesignalService } from './onesignal.service';
import { Config } from '../config';

class MessageService {
    public async getConversation(ctx: Context, receiverId: string, include?: ConversationInclude) {
        AuthService.authenticate(ctx);
        let conversation = await prisma.conversation.findFirst({
            where: {
                members: {
                    every: { userId: { in: [ctx.user.id, ...ctx.user.id !== receiverId ? [receiverId] : []] } },
                    some: { userId: { equals: receiverId } }
                }
            },
            include
        })

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    members: {
                        create: [
                            {
                                user: { connect: { id: ctx.user.id } },
                                isAdmin: true,
                            },
                            ctx.user.id !== receiverId ?
                                {
                                    user: { connect: { id: receiverId } },
                                    isAdmin: true,
                                } : undefined,
                        ],
                    }
                },
                include
            })
        }

        return conversation;
    }

    public async searchConversation(ctx: Context, keyword: string, page?: number) {
        AuthService.authenticate(ctx);
        const pageSize: number = Config.defaultPageSize.value || 10;
        return await prisma.conversation.findMany({
            where: {
                messages: { some: { message: { contains: keyword } } }
            },
            include: {
                messages: {
                    where: { message: { contains: keyword } },
                    take: 1
                }
            },
            take: pageSize,
            skip: pageSize * ((page ?? 1) - 1)
        })
    }

    public async getMessages(ctx: Context, otherUserId: string, pagination?: { take: number, skip?: number }) {
        const conversation = await this.getConversation(ctx, otherUserId);
        return await prisma.message.findMany({
            where: { conversationId: conversation.id },
            ...pagination,
            include: { attachments: true, sender: true }
        });
    }

    public async sendMessage(ctx: Context, data: {
        receiverId: string,
        message: string,
        attachments?: FileUpload[],
    }) {
        let conversation = await this.getConversation(ctx, data.receiverId);
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
                        attachments: { create: files }
                    }
                },
                unreadMessageCount: 0,
                conversation: { update: { updatedAt: new Date() } }
            },
            include: { lastReadMessage: { include: { sender: true } } }
        })).lastReadMessage;

        OnesignalService.sendToAll(data.message);

        this._updateUnreadMessageCount(conversation.id);

        return res;
    }

    public async canSendChat(ctx: Context, conversationId: string, throwError: boolean = true): Promise<Boolean> {
        let result = false;
        result = AuthService.authorize(ctx, { values: [Permission.chat.create] }, throwError);

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
                ..._lastReadMessage ? { createdAt: { gt: _lastReadMessage.createdAt } } : {}
            }
        })
    }
}

const _ = new MessageService();
export { _ as MessageService };