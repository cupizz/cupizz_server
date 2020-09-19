import nodemailer from 'nodemailer';
import { Config } from '../config';
import { JwtOtpPayload } from '../model/otpPayload';
import { AuthService } from '../service';
import { PasswordHandler } from './passwordHandler';
import { Validator } from './validator';

export default class OtpHandler {
    private _otp: string;

    constructor() {
        this._otp = this._random(6);
    }

    /**
     * @returns OTP chỉ được trả về trong môi trường dev, vì thế sử dụng cẩn thận
     */
    public async send(email: string): Promise<{
        token: string,
        otp?: string
    }> {
        Validator.email(email);
        let transporter = nodemailer.createTransport({
            host: "smtp.lolipop.jp",
            port: 465,
            auth: {
                user: 'l_hien@gonosen.asia',
                pass: 'eLud4fxYM-jr',
            },
        });

        await transporter.sendMail({
            from: '"Gonosen" <prostagellc.vn@gmail.com>',
            to: email,
            subject: "リバラブ よりお知らせ",
            text:
                `リバラブ事務局です。
このたびは、アプリ登録お申し込みありがとうございます。
下記コードをアプリ画面にご入力ください。
${this._otp.toString()}`,
        });

        const otpPayload: JwtOtpPayload = {
            email: email,
            otp: PasswordHandler.encode(this._otp.toString())
        }

        if (process.env.NODE_ENV == 'development') {
            console.log(email, this._otp)
        }

        return {
            token: AuthService.sign(otpPayload, Config.OPT_EXPIRE_TIME),
            otp: process.env.NODE_ENV == 'development' ? this._otp : null
        }
    }

    /**
     * Return null if otp is incorrect
     * @param token 
     * @param otp 
     * @returns email
     */
    public static compare(token: string, otp: string): string {
        const payload = AuthService.verify<JwtOtpPayload>(token);
        if (PasswordHandler.compare(otp, payload.otp)) {
            return payload.email;
        }
        return null;
    }

    private _random(length: number) {
        var result = '';
        var characters = '0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
};