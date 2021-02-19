import { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } from 'agora-access-token'

class AgoraService {
    private appId = process.env.AGORA_APP_ID;
    private appCer = process.env.AGORA_CER;

    public async generateRtcToken(channelName: string, uid: number = 0) {
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const privilegeExpiredTs = currentTimestamp + 3600; // 1 hour

        if (!this.appId || !this.appCer) throw 'Missing Agora app info in enviroment file.'
        else if (!channelName) throw 'Missing channel name'

        const key = RtcTokenBuilder.buildTokenWithUid(this.appId, this.appCer, channelName, uid, RtcRole.PUBLISHER, privilegeExpiredTs)

        return key;
    }

    public async generateRtmToken(account: string) {
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const privilegeExpiredTs = currentTimestamp + 3600; // 1 hour

        if (!this.appId || !this.appCer) throw 'Missing Agora app info in enviroment file.'
        else if (!account) throw 'Missing account'

        const key = RtmTokenBuilder.buildToken(this.appId, this.appCer, account, RtmRole.Rtm_User, privilegeExpiredTs)

        return key;
    }
}

const _ = new AgoraService();
export { _ as AgoraService };
