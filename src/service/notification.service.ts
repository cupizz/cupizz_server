import { File, User } from '@prisma/client';
import { ForbiddenError } from 'apollo-server-express';
import Strings from '../constants/strings';
import { Context } from '../context';
import { ErrorNotFound } from '../model/error';
import NotificationPayload from '../model/notificationPayload';
import { prisma } from '../server';
import { AuthService } from './auth.service';
import { OnesignalService } from './onesignal.service';

class NotificationService {
    public async sendLikeOrMatchingNotify(type: 'like' | 'matching', fromUser: User & { avatar: File }, toUser: User): Promise<NotificationPayload | null> {
        const notification = await prisma.notification.create({
            data: {
                type,
                receivers: { create: { receiver: { connect: { id: toUser.id } } } },
                refUser: { connect: { id: fromUser.id } }
            }
        })

        const content = type === 'like'
            ? Strings.notification.newLikeContent(fromUser.nickName)
            : Strings.notification.newMatchContent(fromUser.nickName);

        if (
            type === 'like' && toUser.pushNotiSetting.includes('like')
            || type === 'matching' && toUser.pushNotiSetting.includes('matching')
        ) {
            OnesignalService.sendToUserIds(
                null,
                content,
                [toUser.id],
                notification,
                {
                    largeIcon: fromUser.avatar?.url
                }
            )
        }

        return notification;
    }

    public async sendNewMessageNofity(conversationId: string, messageId: string): Promise<NotificationPayload | null> {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { members: { include: { user: true }, where: { isCurrentlyInChat: false } } }
        })
        const message = await prisma.message.findUnique({
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
            message.message ? Strings.notification.newMessageTitle(message.sender.nickName) : null,
            message.message ?? Strings.notification.newMessageTitle(message.sender.nickName),
            receiverPushIds,
            notificationData,
            {
                largeIcon: message.sender.avatar?.url
            },
        );

        return notificationData;
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
        if ((await prisma.notification.findUnique({
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