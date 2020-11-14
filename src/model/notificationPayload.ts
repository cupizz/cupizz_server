import { NotificationType } from "@prisma/client";

export default class NotificationPayload {
    type: NotificationType
    refUserId: string;
    refConversationId?: string;
}