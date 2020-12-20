import { arg, enumType, mutationField, objectType, stringArg } from "@nexus/schema";
import { Config, ConstConfig } from "../../config";
import { JwtAuthPayload } from "../../model/jwtPayload";
import { JwtRegisterPayload } from "../../model/registerPayload";
import { DefaultRole } from "../../model/role";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";
import { SocialNetworkService } from "../../service/socialNetwork.service";
import { LoginOutputType } from "../types";

export const LoginMutation = mutationField('login', {
    type: LoginOutputType,
    description: '[DONE]',
    args: {
        email: stringArg({ nullable: true }),
        password: stringArg({ nullable: true }),
        deviceId: stringArg(),
    },
    resolve: async (_root, args, _ctx, _info) => {
        return await AuthService.login('email', args.email, args.password, args.deviceId);
    }
})

export const LoginSocialNetwork = mutationField('loginSocialNetwork', {
    type: LoginOutputType,
    args: {
        type: arg({ type: 'SocialProviderEnumType', nullable: false }),
        accessToken: stringArg({ nullable: false }),
        deviceId: stringArg(),
    },
    resolve: async (_root, args, _ctx, _info) => {
        const socialData = await SocialNetworkService.login(args.type, args.accessToken);
        let socialProvider = await prisma.socialProvider.findOne({
            where:
                { id_type: { type: socialData.type, id: socialData.id } },
        })

        if (!socialProvider) {
            socialProvider = await prisma.socialProvider.create({
                data: {
                    ...socialData,
                    user: {
                        create: {
                            nickName: socialData.name ?? socialData.id,
                            role: { connect: { id: DefaultRole.normal.id } },
                            ...socialData.avatar ? { avatar: { create: { type: 'image', url: socialData.avatar } } } : {},
                            ...socialData.birthday ? { birthday: socialData.birthday } : {},
                            ...socialData.phoneNumber ? { phoneNumber: socialData.phoneNumber } : {},
                            ...socialData.gender ? { gender: socialData.gender } : {},
                            pushNotiSetting: ['like', 'matching', 'newMessage', 'other'],
                        }
                    }
                }
            })
        }

        return await AuthService.login(args.type, socialProvider.id, args.deviceId);
    }
})

export const RegisterEmailMutation = mutationField('registerEmail', {
    type: 'TokenOutput',
    description: '[DONE]',
    args: {
        email: stringArg()
    },
    resolve: async (_root, args, _ctx, _info) => {
        const data = await UserService.registerEmail(args.email);
        return {
            token: data.token,
            description: data.otp
        }
    }
})


export const VerifyOtpMutation = mutationField('verifyOtp', {
    type: 'TokenOutput',
    description: '[DONE] Dùng token trả về tại đây, gửi lên khi đăng ký tài khoản. Nếu không sẽ không đăng ký được!',
    args: {
        token: stringArg(),
        otp: stringArg()
    },
    resolve: async (_root, args, _ctx, _info) => {
        return {
            token: await UserService.verifyOtp(args.token, args.otp),
            description: 'Dùng token trả về tại đây, gửi lên khi đăng ký tài khoản!'
        }
    }
})

export const registerMutation = mutationField('register', {
    type: 'LoginOutput',
    description:
        `[DONE]
Cần truyền vào token lấy được sau khi verify otp.
Trả về token để login`,
    args: {
        token: stringArg({ nullable: false }),
        nickName: stringArg({ nullable: false }),
        password: stringArg({ nullable: true }),
    },
    resolve: async (_root, args, _ctx, _info) => {
        const user = await UserService.register(args.token, { ...args });

        return {
            token: AuthService.sign({ userId: user.id } as JwtAuthPayload),
            info: user,
        }
    }
})