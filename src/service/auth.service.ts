import { Role, SocialProviderType, User } from "@prisma/client";
import { ForbiddenError } from "apollo-server-express";
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { Config } from "../config";
import Strings from "../constants/strings";
import { Context } from '../context';
import { ClientError, ErrorEmailNotFound, ErrorIncorrectPassword, ErrorTokenExpired, ErrorUnAuthenticate } from '../model/error';
import { JwtAuthPayload } from "../model/jwtPayload";
import { prisma } from '../server';
import { logger } from "../utils/logger";
import { PasswordHandler } from "../utils/passwordHandler";
import { Validator } from "../utils/validator";
import { UserService } from "./user.service";

class PermissionFilter {
    values?: string[];
    nesteds?: PermissionFilter[];
    type?: 'and' | 'or'; // Default is and
}

class AuthService {
    public async login(type: SocialProviderType, id: string, password?: string, deviceId?: string): Promise<{ token: string, info: User }> {
        let user = (await prisma.socialProvider.findOne({
            where: { id_type: { id, type } },
            include: { user: true }
        }))?.user;

        if (user) {
            if (user.deletedAt !== null) {
                throw ClientError(Strings.error.accountHasBeenDeleted);
            }

            if (type === 'email') {
                Validator.email(id);
                Validator.password(password);
                if (!PasswordHandler.compare(password || '', user.password)) {
                    throw ErrorIncorrectPassword;
                }
            }
            await UserService.validateValidAccount(user);
            UserService.updateOnlineStatus(user);

            const token = this.sign({ userId: user.id } as JwtAuthPayload);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    userDeviceTokens: {
                        // Xóa các device bị trùng, và token hết hạn
                        deleteMany: {
                            OR: [
                                deviceId ? { userId: user.id, deviceId } : {},
                                { expireAt: { lt: new Date() } }
                            ]
                        },
                        create: {
                            token, deviceId,
                            expireAt: new Date(Config.loginTokenExpireTime.value * 60 * 1000 + Date.now()),
                        }
                    }
                }
            })

            return { token, info: user };
        }
        throw ErrorEmailNotFound;
    }

    public authorize(ctx: Context, requiredPermissions: PermissionFilter, throwError: boolean = true): boolean {
        return this.authorizeUser(ctx.user, requiredPermissions, throwError);
    }

    public authorizeUser(user: User & { role: Role }, requiredPermissions: PermissionFilter, throwError: boolean = true): boolean {
        if (!this.authenticateUser(user, throwError)) return false;
        const missingPermissions = this._authorize(user.role.permissions, requiredPermissions);
        if (missingPermissions.length > 0) {
            if (throwError) {
                throw new ForbiddenError('Missing permissions: ' + missingPermissions.join(', '));
            }
            return false;
        }
        return true;
    }

    /**
     * @returns missing permistions
     */
    private _authorize(userPermissions: string[], requiredPermissions: PermissionFilter): string[] {
        const missingPermissions: string[] = [];
        if (requiredPermissions.type == 'or') {
            if (requiredPermissions.values?.every(e => !userPermissions.includes(e))) {
                requiredPermissions.nesteds?.forEach(nested =>
                    missingPermissions.push(...this._authorize(userPermissions, nested)))
                if (missingPermissions.length == 0) {
                    missingPermissions.push(requiredPermissions.values[0]);
                }
            }
        } else {
            requiredPermissions.values?.forEach(e => {
                if (!userPermissions.includes(e)) missingPermissions.push(e);
            })

            requiredPermissions.nesteds?.forEach(nested =>
                missingPermissions.push(...this._authorize(userPermissions, nested)))
        }

        return missingPermissions;
    }

    public authenticate(ctx: Context, throwError: boolean = true): boolean {
        return this.authenticateUser(ctx.user, throwError);
    }

    public authenticateUser(user: User, throwError: boolean = true): boolean {
        if (!user) {
            if (throwError) throw ErrorUnAuthenticate();
            return false;
        }
        return true;
    }

    public sign<T extends object>(payload: T, expiresIn?: number): string {
        const expire = expiresIn || Config.loginTokenExpireTime.value;
        return jwt.sign(
            payload,
            process.env.JWT_SECRET_KEY,
            { expiresIn: `${expire}m` }
        );
    }

    public async verifyUser(token: string) {
        try {
            let decoded = {};
            decoded = jwt.verify(token ?? '', process.env.JWT_SECRET_KEY);

            const payload: JwtAuthPayload = (typeof decoded === 'string') ? JSON.parse(decoded) : decoded;

            const user = (await prisma.userDeviceToken.findOne({
                where: { token: token },
                include: { user: { include: { role: true } } }
            }))?.user;

            if (user?.id === payload.userId) {
                return user;
            }
            return null;
        } catch (e) {
            return null;
        }
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
