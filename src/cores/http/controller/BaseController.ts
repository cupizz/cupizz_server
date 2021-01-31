import e from "express";
import {HttpResponse} from "../response/HttpResponse";

export abstract class BaseController <T>{
    run = async (req: e.Request, res: e.Response, next: e.NextFunction): Promise<HttpResponse<T>> => {
        const httpSuccess = await this.execute(req, res);
        return httpSuccess;
    }

    handle = (req: e.Request, res: e.Response, next: e.NextFunction): void => {
        this.run(req, res, next).then((httpSuccess) => {
            return res.status(httpSuccess.code).send(httpSuccess.transform());
        }).catch((httpError) => {
            return res.status(httpError.code).send(httpError.transform());
        });
    }

    protected abstract execute(req: e.Request, res: e.Response) : Promise<HttpResponse<T>>;
}