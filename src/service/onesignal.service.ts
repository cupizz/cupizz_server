import { Client } from 'onesignal-node';
import { CreateNotificationBody } from 'onesignal-node/lib/types';
import { Config } from '../config';

class OnesignalService {
    private _client = new Client(Config.onesignalAppId, Config.onesignalApiKey);

    public async sendToAll(message: string) {
        const result = this.sendNotification({
            contents: {
                en: message,
                jp: message,
            },
            included_segments: ['All'],
        })
        return result;
    }

    public async sendNotification(body: CreateNotificationBody) {
        const result = await this._client.createNotification(body);
        return result;
    }
}

const _ = new OnesignalService();

export { _ as OnesignalService };
