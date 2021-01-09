import { mutationField, objectType, stringArg } from "@nexus/schema";
import { ForgotPassService } from "../../service/forgotPassword.service";

export const forgotPasswordMutation = mutationField('forgotPassword', {
    type: 'String',
    args: {
        email: stringArg({ nullable: false }),
    },
    resolve: async (_root, args, _ctx, _info) => {
        return (await ForgotPassService.fotgotPass(args.email)).token;
    }
})

export const validateForgotPasswordTokenMutation = mutationField('validateForgotPasswordToken', {
    type: objectType({
        name: 'ValidateForgotPasswordTokenOutput',
        definition(t) {
            t.field('nickName', { type: 'String', nullable: false })
            t.field('token', { type: 'String', nullable: false })
            t.field('avatar', { type: 'File', nullable: true })
        }
    }),
    args: {
        token: stringArg({ nullable: false }),
        otp: stringArg({required: true})
    },
    resolve: async (_root, args, _ctx, _info) => {
        const data = await ForgotPassService.verifyOtp(args.token, args.otp);

        return data;
    }
})

export const changePasswordByForgotPasswordTokenMutation = mutationField('changePasswordByForgotPasswordToken', {
    type: 'Boolean',
    args: {
        token: stringArg({ nullable: false }),
        newPassword: stringArg({ nullable: false })
    },
    resolve: async (_root, args, _ctx, _info) => {
        await ForgotPassService.changePassword(args.token, args.newPassword);
        return true;
    }
})