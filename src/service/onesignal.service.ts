import { Client } from 'onesignal-node';
import { CreateNotificationBody } from 'onesignal-node/lib/types';
import NotificationPayload from '../model/notificationPayload';
import { logger } from '../utils/logger';

class OnesignalService {
    private _client = new Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_API_KEY);

    public async sendToAll(title: string, message: string, subtitle?: string) {
        const result = this.sendNotification({
            headings: { en: title },
            ...subtitle ? {
                subtitle: { en: subtitle }
            } : {},
            contents: { en: message },
            included_segments: ['All'],
        })
        return result;
    }

    public async sendToUserIds(title: string, message: string, userIds: string[], data: NotificationPayload, subtitle?: string, image?: string) {
        if (userIds.length === 0) return;

        const filters = userIds
            .map((e, i) =>
                ({ "field": "tag", "key": "userId", "relation": "=", "value": e }))
            .reduce(
                (r, a, i) => (i !== 0 ? r.concat({ "operator": "OR" }, a) : r.concat(a)),
                []
            )
        try {
            const result = await this.sendNotification({
                ...title ? {
                    headings: { en: title }
                } : {},
                ...subtitle ? {
                    subtitle: { en: subtitle }
                } : {},
                contents: { en: message },
                big_picture: image,
                adm_big_picture: image,
                ios_attachments: image ? { id1: image } : null,
                filters,
                data,
            })

            return result;
        } catch (error) {
            logger(error?.body?.errors);
            throw error;
        }
    }

    public async sendNotification(body: CreateNotificationBody) {
        const result = await this._client.createNotification(body);
        return result;
    }

    public async cancelNotification(oneSignalNotiId: string) {
        await this._client.cancelNotification(oneSignalNotiId);
    }

    public async cancelNotifications(oneSignalNotiIds: string[]) {
        await Promise.all(oneSignalNotiIds.map(async e => await this.cancelNotification(e)))
    }
}

const _ = new OnesignalService();

export { _ as OnesignalService };
