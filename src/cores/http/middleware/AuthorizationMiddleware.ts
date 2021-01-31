import {StatusCodes} from 'http-status-codes';
import {HttpMiddleware} from "@cores/http/middleware/HttpMiddleware";
import e from "express";
import {AuthService} from "../../../service";

class AuthorizationMiddleware implements HttpMiddleware {
    interceptor = async (req: e.Request, res: e.Response, next: e.NextFunction) => {
        try {
            const jwt = req.headers.authorization;
            if (!jwt) {
                throw Error('JWT not present in req authorization header!');
            }

            const token = this.extractToken(jwt);
            if (!token) {
                throw Error('Invalid JWT Token');
            }
            const user = await AuthService.verifyUser(token);
            if (!user) {
                throw Error('Invalid JWT Token');
            }
            res.locals.auth = user;
            next();
        } catch (err) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: err.message ? err.message : err,
            });
        }
    }

    private extractToken = (bearer: string): string | undefined => {
        const tmp: string[] = bearer.split(' ');
        return (tmp && tmp.length > 1) ? tmp[1] : undefined;
    }
}

const _ = new AuthorizationMiddleware();
export {_ as AuthorizationMiddleware};