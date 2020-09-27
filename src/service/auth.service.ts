import { ForbiddenError } from "apollo-server-express";
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { Context } from '../context';
import { ErrorTokenExpired, ErrorUnAuthenticate } from '../model/error';
import { JwtAuthPayload } from "../model/jwtPayload";
import { prisma } from '../server';

class PermissionFilter {
    values?: string[];
    nesteds?: PermissionFilter[];
    type?: 'and' | 'or'; // Default is and
}

class AuthService {
    public authorize(ctx: Context, requiredPermissions: PermissionFilter) {
        this.authenticate(ctx);
        if (!this._authorize(ctx.user.role.permissions, requiredPermissions)) {
            throw new ForbiddenError('Forbidden');
        }
    }

    private _authorize(userPermissions: string[], requiredPermissions: PermissionFilter): boolean {
        if (requiredPermissions.type != 'or') {
            if (requiredPermissions.values.every(e => userPermissions.includes(e))) {
                for (let nested of (requiredPermissions.nesteds ?? [])) {
                    if (!this._authorize(userPermissions, nested)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        } else {
            if (!requiredPermissions.values.some(e => userPermissions.includes(e))) {
                for (let nested of (requiredPermissions.nesteds ?? [])) {
                    if (this._authorize(userPermissions, nested)) {
                        return true;
                    }
                }
                return false;
            }
            return true;
        }
    }

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

    public async verifyUser(token: string) {
        let decoded = {};
        try {
            decoded = jwt.verify(token ?? '', process.env.JWT_SECRET_KEY);
        } catch (e) {
            return null;
        }

        const payload: JwtAuthPayload = (typeof decoded === 'string') ? JSON.parse(decoded) : decoded;

        return await prisma.user.findOne({ where: { id: payload.userId }, include: { role: true } });
    }

    public verify<T>(token: string): T {
        let decoded = {};
        try {
            decoded = jwt.verify(token ?? '', process.env.JWT_SECRET_KEY);
        } catch (e) {
            if (e instanceof TokenExpiredError) {
                throw ErrorTokenExpired;
            }
            throw new Error(e);
        }

        const { iat, exp, ...payload } = (typeof decoded === 'string') ? JSON.parse(decoded) : decoded

        return payload;
    }
}

const _ = new AuthService();
export { _ as AuthService };
