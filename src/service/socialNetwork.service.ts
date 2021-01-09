import { SocialProviderCreateWithoutUserInput } from '@prisma/client'
import request from 'request';
import { ErrorUnAuthenticate, ClientError } from '../model/error';
import Strings from '../constants/strings';
import { NexusGenEnums } from '../schema/generated/nexus';
import { logger } from '../utils/logger';

class SocialNetworkService {
    public async login(type: NexusGenEnums['SocialProviderEnumType'], data: string): Promise<SocialProviderCreateWithoutUserInput> {
        switch (type) {
            case 'email':
                throw new Error("Please use API registerEmail or login");
            case 'google':
                return await this._loginGoogle(data);
            case 'facebook':
                return await this._loginFacebook(data);
            default:
                throw ClientError(Strings.inDevelopment);
        }
    }

    private async _loginGoogle(accessToken: string): Promise<SocialProviderCreateWithoutUserInput> {
        try {
            const res = await new Promise<request.Response>((resolve, reject) => {
                request.get({
                    url: 'https://people.googleapis.com/v1/people/me?requestMask.includeField=person.emailAddresses,person.phoneNumbers,person.names,person.photos,person.genders,person.birthdays',
                    headers: { Authorization: 'Bearer ' + accessToken },
                    callback: (e, res) => {
                        if (e) {
                            reject(e);
                        } else {
                            resolve(res);
                        }
                    }
                })
            });

            if (res.statusCode != 200) throw new Error(res.body);

            const decoded = JSON.parse(res.body);
            const avatar = decoded.photos?.[0]?.url;

            return {
                id: (decoded.resourceName as string).split('/')[1],
                type: 'google',
                avatar: avatar ? avatar.split('s100').reverse().splice(1).reverse().join('s100') + 's700' : null,
                birthday: decoded.birthdays?.[0]?.date ? new Date(decoded.birthdays?.[0]?.date?.year, decoded.birthdays?.[0]?.date?.month, decoded.birthdays?.[0]?.date?.day) : null,
                name: decoded.names?.[0]?.displayName,
                email: decoded.emailAddresses?.[0]?.value,
                gender: decoded.genders?.[0]?.addressMeAs,
                phoneNumber: decoded.phoneNumbers?.[0]?.value,
            }
        } catch (e) {
            logger(e);
            throw ErrorUnAuthenticate(Strings.error.cannotAuthenticateGoogleAccount);
        }
    }

    private async _loginFacebook(accessToken: string): Promise<SocialProviderCreateWithoutUserInput> {
        try {
            const res = await new Promise<request.Response>((resolve, reject) => {
                request.get({
                    url: 'https://graph.facebook.com/v8.0/me?fields=id%2Cname%2Cbirthday%2Cemail%2Cgender&access_token=' + accessToken,
                    callback: (e, res) => {
                        if (e) {
                            reject(e);
                        } else {
                            resolve(res);
                        }
                    }
                })
            });

            if (res.statusCode != 200) throw new Error();

            const decoded = JSON.parse(res.body);

            return {
                id: decoded.id,
                type: 'facebook',
                avatar: decoded.id ? await this._getFacebookAvatar(decoded.id) : null,
                birthday: decoded.birthday ? new Date(decoded.birthday) : null,
                name: decoded.name,
                email: decoded.email,
                gender: decoded.gender,
            }
        } catch (e) {
            throw ErrorUnAuthenticate(Strings.error.cannotAuthenticateGoogleAccount);
        }
    }

    private async _getFacebookAvatar(userId: string): Promise<string> {
        return `https://graph.facebook.com/${userId}/picture?type=large&width=720&height=720`;
    }
}

const _ = new SocialNetworkService();
export { _ as SocialNetworkService }