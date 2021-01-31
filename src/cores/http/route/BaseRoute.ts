import {Router} from "express";

export abstract class BaseRoute {
    protected _router: Router;
    protected _isInitRoutes: boolean;

    constructor() {
        this._router = Router();
        this._isInitRoutes = false;
    }

    public get = () => {
        if (this._isInitRoutes) return this._router;
        else {
            this.routes();
            return this._router;
        }
    };
    protected abstract routes(): void;
}