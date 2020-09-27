import { arg, mutationField, objectType, stringArg } from "@nexus/schema";
import { Config } from "../../config";
import { JwtAuthPayload } from "../../model/jwtPayload";
import { JwtRegisterPayload } from "../../model/registerPayload";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";
import { SocialNetworkService } from "../../service/socialNetwork.service";
import { LoginOutputType } from "../types";

export const LoginMutation = mutationField('login', {
    type: LoginOutputType,
    description: '[DONE]',
    args: {
        email: stringArg(),
        password: stringArg(),
    },
    resolve: async (_root, args, _ctx, _info) => {
        return await UserService.authenticate(args.email, args.password);
    }
})

export const LoginSocialNetwork = mutationField('loginSocialNetwork', { 
    type: objectType({
        name: 'LoginSocialOutput',
        definition(t) {
            t.string('token', { nullable: false })
            t.field('info', { type: 'User', nullable: true })
        }
    }),
    args: {
        type: arg({ type: 'SocialProviderEnumType', nullable: false }),
        accessToken: stringArg({ nullable: false }),
    },
    resolve: async (_root, args, _ctx, _info) => {
        const socialData = await SocialNetworkService.login(args.type, args.accessToken);
        const socialProvider = await prisma.socialProvider.findOne({
            where:
                { id_type: { type: socialData.type, id: socialData.id } },
            include: { user: true }
        })

        if (socialProvider) {
            return {
                token: AuthService.sign<JwtAuthPayload>({ userId: socialProvider.userId }),
                info: socialProvider.user
            }
        } else {
            const user = await UserService.register(
                AuthService.sign<JwtRegisterPayload>({ ...socialData }, Config.registerExpireTime),
                {
                    nickName: socialData.name || ''
                }
            )
            return {
                token: AuthService.sign<JwtAuthPayload>({ userId: user.id }),
                info: user
            }
        }
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