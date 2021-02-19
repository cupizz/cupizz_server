import { File, User } from '@prisma/client';
import { ForbiddenError } from 'apollo-server-express';
import { logger } from '../utils/logger';
import Strings from '../constants/strings';
import { Context } from '../context';
import { ErrorNotFound } from '../model/error';
import NotificationPayload from '../model/notificationPayload';
import { prisma } from '../server';
import { AuthService } from './auth.service';
import { OnesignalService } from './onesignal.service';

class NotificationService {
    public async sendLikeOrMatchingNotify(type: 'like' | 'matching', fromUser: User & { avatar: File }, toUser: User, isSuperLike: boolean): Promise<NotificationPayload | null> {
        const notification = await prisma.notification.create({
            data: {
                type,
                receivers: { create: { receiver: { connect: { id: toUser.id } } } },
                refUser: { connect: { id: fromUser.id } }
            }
        })

        const content = type === 'like'
            ? (isSuperLike
                ? Strings.notification.newSuperLikeContent(fromUser.nickName)
                : Strings.notification.newLikeContent(await prisma.friend.count({ where: { isSuperLike: false, readSent: false, receiverId: toUser.id } }))
            ) : Strings.notification.newMatchContent(fromUser.nickName);

        if (
            type === 'like' && toUser.pushNotiSetting.includes('like')
            || type === 'matching' && toUser.pushNotiSetting.includes('matching')
        ) {
            OnesignalService.sendToUserIds(
                null,
                content,
                [toUser.id],
                notification,
                type === 'like' && isSuperLike || type === 'matching' ? {
                    largeIcon: fromUser.avatar?.url
                } : {}
            )
        }

        return notification;
    }

    public async sendNewMessageNofity(conversationId: string, messageId: string): Promise<NotificationPayload | null> {
        const conversation = await prisma.conversation.findOne({
            where: { id: conversationId },
            include: { members: { include: { user: true }, where: { isCurrentlyInChat: false } } }
        })
        const message = await prisma.message.findOne({
            where: { id: messageId },
            include: { sender: { include: { avatar: true } } }
        })

        if (!conversation || !message)
            throw ErrorNotFound(`${conversation ? 'Message' : 'Conversation'} is not found`);

        const receiverPushIds = conversation.members
            .filter(e => e.user.pushNotiSetting.includes('newMessage') && e.userId !== message.senderId)
            .map(e => e.userId);


        const notificationData: NotificationPayload = {
            type: 'newMessage',
            refUserId: message.senderId,
            refConversationId: conversationId,
        }

        OnesignalService.sendToUserIds(
            message.message ? Strings.notification.newMessageTitle(message.isAnonymousChat ? 'Trò chuyện ẩn danh' : message.sender.nickName) : null,
            message.message ?? Strings.notification.newMessageTitle(message.isAnonymousChat ? 'Trò chuyện ẩn danh' : message.sender.nickName),
            receiverPushIds,
            notificationData,
            {
                largeIcon: message.isAnonymousChat ? null : message.sender.avatar?.url
            },
        );

        return notificationData;
    }

    public async sendSomeOneFindingAnonymousChat(): Promise<NotificationPayload | null> {
        const receivers = await prisma.user.findMany({
            where: {
                isFindingAnonymousChat: false,
                conversationMembers: {
                    every: { conversation: { isAnonymousChat: false } }
                },
            }
        })
        const receiverPushIds = receivers
            .filter(e => e.pushNotiSetting.includes('otherFindingAnonymousChat'))
            .map(e => e.id)

        const allTitles = [
            'Ai đó đang cần tìm người bầu bạn. Bạn có muốn tâm sự cùng họ?',
            'Có người muốn nói chuyện với bạn. Nhắn tin ngay!'
        ]
        const title = allTitles[Math.floor(Math.random() * allTitles.length)];

        const notification = await prisma.notification.create({
            data: {
                type: 'otherFindingAnonymousChat',
                title,
                receivers: {
                    create: receiverPushIds.map(e => ({ receiver: { connect: { id: e } } }))
                },
            }
        })

        OnesignalService.sendToUserIds(
            null,
            title,
            receiverPushIds,
            notification,
            {}
        );

        logger('Sent notification about someone finding anonymous chat.')

        return notification;
    }

    public async sendDeleteAnonymousChat(toUserIds: string[]) {
        const allTitles = [
            'Partner trò chuyện ẩn danh với bạn đã chọn phương án nghỉ chơi.',
            'Trò chuyện ẩn danh: Đối phương đã ngưng trò chuyện'
        ]
        const title = allTitles[Math.floor(Math.random() * allTitles.length)];

        OnesignalService.sendToUserIds(
            null,
            title,
            toUserIds,
            {
                type: 'other',
                refUserId: null,
                code: 'deleteAnonymousChat',
            },
            {}
        );

        logger(`Sent delete anonymous chat to user ${toUserIds}.`)
    }

    public async sendOtherNofity(title: string, content: string, receiverIds: string[]): Promise<NotificationPayload | null> {
        const receivers = await prisma.user.findMany({ where: { id: { in: receiverIds } } })
        const receiverPushIds = receivers
            .filter(e => e.pushNotiSetting.includes('other'))
            .map(e => e.id)

        const notification = await prisma.notification.create({
            data: {
                type: 'other',
                title: title,
                content: content,
                receivers: {
                    create: receiverPushIds.map(e => ({ receiver: { connect: { id: e } } }))
                },
            }
        })

        OnesignalService.sendToUserIds(
            title,
            content,
            receiverPushIds,
            notification,
            {}
        );

        return notification;
    }

    public async markAsReadNotification(ctx: Context, notificationId: string) {
        // Validation
        AuthService.authenticate(ctx);
        if ((await prisma.notification.findOne({
            where: { id: notificationId },
            include: { receivers: true }
        })).receivers.findIndex(e => e.receiverId === ctx.user.id) < 0) {
            throw new ForbiddenError(Strings.error.notificationIsNotBelongToYou)
        }

        const notification = await prisma.notificationReceiver.update({
            where: {
                notificationId_receiverId: {
                    notificationId,
                    receiverId: ctx.user.id
                }
            },
            data: { readAt: new Date() }
        });

        return notification;
    }
}

const _ = new NotificationService();
export { _ as NotificationService };