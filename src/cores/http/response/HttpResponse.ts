import {StatusCodes} from "http-status-codes";

export class HttpResponse<T> {
    error?: any;
    data?: T;
    code: number;
    message?: string;
    isFailed: boolean;

    protected constructor(error: any, data: T, code: number, isFailed: boolean, message?: string) {
        this.error = error;
        this.data = data;
        this.code = code;
        this.message = message;
        this.isFailed = isFailed;
    }

    public static success<U>(data?: U, code: number = StatusCodes.OK, message?: string): HttpResponse<U> {
        return new HttpResponse<U>(undefined, data, code, false, message);
    }

    public static fail<U>(error: any, code: number = StatusCodes.INTERNAL_SERVER_ERROR, message?: string): HttpResponse<U> {
        return new HttpResponse<U>(error, undefined, code, true, message);
    }

    public transform() {
        return {
            error: this.error,
            data: this.data,
            message: this.message,
        }
    };
}