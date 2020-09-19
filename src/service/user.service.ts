
import { ArgsValue } from '@nexus/schema/dist/typegenTypeHelpers';
import { Friend, User } from '@prisma/client';
import { AuthService } from '.';
import { Config } from '../config';
import { ErrorEmailExisted, ErrorEmailNotFound, ErrorIncorrectPassword, ErrorOtpIncorrect, ErrorTokenIncorrect } from '../model/error';
import { JwtAuthPayload } from '../model/jwtPayload';
import { JwtRegisterPayload } from '../model/registerPayload';
import { DefaultRole } from '../model/role';
import { FriendStatusEnum } from '../schema/types';
import { prisma } from '../server';
import OtpHandler from '../utils/otpHandler';
import { PasswordHandler } from '../utils/passwordHandler';
import { Validator } from '../utils/validator';
import { FileService } from './file.service';

class UserService {
    public async authenticate(email: string, password: string): Promise<{ token: string, info: User }> {
        Validator.email(email);
        Validator.password(password);
        let user = (await prisma.socialProvider.findOne({
            where: {
                id_type: {
                    id: email,
                    type: 'email'
                }
            }, include: { user: true }
        }))?.user;

        if (user) {
            if (!PasswordHandler.compare(password, user.password)) {
                throw ErrorIncorrectPassword;
            }

            return {
                token: AuthService.sign({ userId: user.id } as JwtAuthPayload),
                info: user
            };
        }
        throw ErrorEmailNotFound;
    }

    /**
     * @returns OTP chỉ được trả về trong môi trường dev, vì thế sử dụng cẩn thận
     */
    public async registerEmail(email: string): Promise<{
        token: string,
        otp?: string
    }> {
        let socialProvider = (await prisma.socialProvider.findOne({
            where: {
                id_type: {
                    id: email,
                    type: 'email'
                }
            }, include: { user: true }
        }));

        if (socialProvider) {
            throw ErrorEmailExisted;
        }
        const otpHandler = new OtpHandler();
        const otpToken = otpHandler.send(email)

        return otpToken;
    }

    public async verifyOtp(token: string, otp: string): Promise<string> {
        const email = OtpHandler.compare(token, otp);

        if (!email) {
            throw ErrorOtpIncorrect;
        }

        const registerPayload: JwtRegisterPayload = { type: 'email', id: email }

        return AuthService.sign(registerPayload, Config.REGISTER_EXPIRE_TIME);
    }

    public async register(token: string, data: ArgsValue<'Mutation', 'register'>): Promise<User> {
        // Lấy thông tin từ token
        // TODO get social network info

        const payload = AuthService.verify<JwtRegisterPayload>(token);

        if (!payload?.type || !payload?.id) {
            throw ErrorTokenIncorrect;
        } else if (await prisma.socialProvider.findOne({
            where: {
                id_type: {
                    type: payload.type,
                    id: payload.id,
                }
            }
        })) {
            throw ErrorEmailExisted
        }

        // Chuẩn bị dữ liệu để tạo user
        const city = await prisma.city.findOne({ where: { id: data.cityId } })
        const citysOtherPerson = await prisma.city.findMany({ where: { id: { in: data.cityIdsOtherPerson } } })
        const identifyImage = await FileService.upload(await data.identifyImage);
        const images = await Promise.all(data.images ?? [])

        return prisma.user.create({
            data: {
                nickName: data.nickName,
                password: PasswordHandler.encode(data.password),
                birthday: data.birthday,
                city: { connect: { id: city.id } },
                area: { connect: { id: city.areaId } },
                genderBorn: data.genderBorn,
                gender: data.gender,
                bodies: { set: data.bodies },
                personalities: { set: data.personalities },
                hobbies: { set: data.hobbies },
                identifyImage: { create: identifyImage },
                userImage: { create: (await FileService.uploadMulti(images)).map(e => ({ image: { create: e } })) },
                introduction: data.introduction,
                agesOtherPerson: { set: data.agesOtherPerson },
                userAreaOtherPerson: { create: citysOtherPerson.map(e => ({ area: { connect: { id: e.areaId } } })) },
                userCityOtherPerson: { create: data.cityIdsOtherPerson.map(e => ({ city: { connect: { id: e } } })) },
                genderBornOtherPerson: { set: data.genderBornOtherPerson ?? [] },
                genderOtherPerson: { set: data.genderOtherPerson ?? [] },
                bodiesOtherPerson: { set: data.bodiesOtherPerson ?? [] },
                personalitiesOtherPerson: { set: data.personalitiesOtherPerson ?? [] },

                role: { connect: { id: DefaultRole.trial.id } },
                socialProvider: { create: payload },
            }
        });
    }

    public async getFriendStatus(myId: number, otherId: number): Promise<{ status: FriendStatusEnum, data: Friend }> {

        let status: FriendStatusEnum = FriendStatusEnum.none;
        let friend;

        if (!myId || !otherId) { status = FriendStatusEnum.none; }
        else if (otherId === myId) { status = FriendStatusEnum.me; }
        else {
            friend = await prisma.friend.findOne({
                where: {
                    senderId_receiverId: {
                        receiverId: myId,
                        senderId: otherId
                    }
                }
            })

            if (friend) {
                status = friend.acceptedAt ? FriendStatusEnum.friend : FriendStatusEnum.received;
            } else {
                friend = await prisma.friend.findOne({
                    where: {
                        senderId_receiverId: {
                            senderId: myId,
                            receiverId: otherId
                        }
                    }
                })

                status = !friend ? FriendStatusEnum.none :
                    (friend.acceptedAt ? FriendStatusEnum.friend : FriendStatusEnum.sent);
            }
        }

        return {
            status: status,
            data: friend
        }
    }
}



const _ = new UserService();
export { _ as UserService };
