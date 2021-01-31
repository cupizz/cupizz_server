import {
    GetCityController,
    GetCountryController,
    GetDeviceCategoryController,
    GetGenderController,
    GetPlatformController,
    GetSessionByDayController,
    GetTimeLineLastWeekController
} from "../controllers";
import {BaseRoute} from "@cores/http";
import {AuthorizationMiddleware} from "@cores/http/middleware";

class GoogleAnalyticsRoute extends BaseRoute {

    routes(): void {
        this._router.get('/city', AuthorizationMiddleware.interceptor, GetCityController.handle);
        this._router.get('/country', AuthorizationMiddleware.interceptor, GetCountryController.handle);
        this._router.get('/platform', AuthorizationMiddleware.interceptor, GetPlatformController.handle);
        this._router.get('/gender', AuthorizationMiddleware.interceptor, GetGenderController.handle);
        this._router.get('/device/category', AuthorizationMiddleware.interceptor, GetDeviceCategoryController.handle);
        this._router.get('/session_by_day', AuthorizationMiddleware.interceptor, GetSessionByDayController.handle);
        this._router.get('/timeline', AuthorizationMiddleware.interceptor, GetTimeLineLastWeekController.handle);
    }
}

const _ = new GoogleAnalyticsRoute();
export {_ as GoogleAnalyticsRoute}