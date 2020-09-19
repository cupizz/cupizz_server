import { User } from "@prisma/client";
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { Context } from '../context';
import { ErrorUnAuthenticate, ErrorTokenExpired } from '../model/error';
import { JwtAuthPayload } from "../model/jwtPayload";
import { prisma } from '../server';

class AuthService {
    public authenticate(ctx: Context) {
        if (!ctx.user)
            throw ErrorUnAuthenticate();
    }

    public sign<T extends object>(payload: T, expiresIn?: string): string {
        return jwt.sign(
            payload,
            process.env.JWT_SECRET_KEY,
            {
                expiresIn: expiresIn || `${process.env.USER_TOKEN_EXPIRE_DAY || '1'} days`
            }
        );
    }

    public verifyUser(token: string): Promise<User | null> {
        let decoded = {};
        try {
            decoded = jwt.verify(token ?? '', process.env.JWT_SECRET_KEY);
        } catch (e) {
            return null;
        }

        const payload: JwtAuthPayload = (typeof decoded === 'string') ? JSON.parse(decoded) : decoded;

        return prisma.user.findOne({ where: { id: payload.userId } })
    }

    public verify<T>(token: string): T {
        let decoded = {};
        try {
            decoded = jwt.verify(token ?? '', process.env.JWT_SECRET_KEY);
        } catch (e) {
            if(e instanceof TokenExpiredError) {
                throw ErrorTokenExpired;
            }
            throw new Error(e);
        }

        const {iat, exp, ...payload} = (typeof decoded === 'string') ? JSON.parse(decoded) : decoded

        return payload;
    }
}

const _ = new AuthService();
export { _ as AuthService };
