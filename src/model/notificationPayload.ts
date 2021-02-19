import { NotificationType } from "@prisma/client";

export default class NotificationPayload {
    type: NotificationType
    code?: string;
    refUserId?: string;
    refConversationId?: string;
}