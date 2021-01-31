import { NextFunction, Request, Response } from 'express';
export interface HttpMiddleware{
    interceptor(req: Request, res: Response, next: NextFunction): any;
}