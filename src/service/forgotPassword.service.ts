import { File } from '@prisma/client';
import { Config } from '../config';
import { ErrorEmailNotFound, ErrorOtpIncorrect, ErrorTokenIncorrect } from '../model/error';
import { JwtForgotPassPayload } from '../model/registerPayload';
import { prisma } from '../server';
import OtpHandler from '../utils/otpHandler';
import { PasswordHandler } from '../utils/passwordHandler';
import { Validator } from '../utils/validator';
import { AuthService } from './';

class ForgotPassService {
    /**
     * @returns OTP chỉ được trả về trong môi trường dev, vì thế sử dụng cẩn thận
     */
    public async fotgotPass(email: string): Promise<{
        token: string,
        otp?: string
    }> {
        Validator.email(email);
        const socialProvider = await prisma.socialProvider.findOne({
            where: { id_type: { id: email, type: 'email' } },
            include: { user: true }
        });

        if (!socialProvider) throw ErrorEmailNotFound;

        const otpHandler = new OtpHandler();
        const otpToken = otpHandler.sendForgotPass(email)

        return otpToken;
    }

    public async verifyOtp(token: string, otp: string): Promise<{
        token: string,
        nickName: string,
        avatar?: File,
    }> {
        const email = OtpHandler.compare(token, otp);

        if (!email) {
            throw ErrorOtpIncorrect;
        }

        const socialProvider = await prisma.socialProvider.findOne({
            where: { id_type: { type: 'email', id: email } },
            include: { user: { include: { avatar: true } } }
        });

        if (!socialProvider) {
            throw ErrorTokenIncorrect;
        }

        return {
            token: AuthService.sign({ email } as JwtForgotPassPayload, Config.registerExpireTime.value),
            nickName: socialProvider.user?.nickName ?? '',
            avatar: socialProvider.user?.avatar,
        }
    }

    public async changePassword(token: string, newPass: string) {
        const payload = AuthService.verify<JwtForgotPassPayload>(token);
        Validator.password(newPass);

        if (!payload.email) {
            throw ErrorOtpIncorrect;
        }

        const sns = await prisma.socialProvider.update({
            where: { id_type: { type: 'email', id: payload.email } },
            data: {
                user: { update: { password: PasswordHandler.encode(newPass) } }
            }
        })

        // Logout all device
        await prisma.userDeviceToken.deleteMany({
            where: { userId: sns.userId }
        })
    }
}

const _ = new ForgotPassService();
export { _ as ForgotPassService };
