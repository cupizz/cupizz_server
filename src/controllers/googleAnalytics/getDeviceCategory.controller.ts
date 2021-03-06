import e from "express";
import {GoogleAnalyticsService} from "../../service";
import {logger} from "../../utils/logger";
import {StatusCodes} from "http-status-codes";
import {analyticsdata_v1alpha} from "googleapis";
import {BaseController, HttpResponse} from "@cores/http";

class GetDeviceCategoryController extends BaseController<any> {
    protected async execute(req: e.Request, res: e.Response): Promise<HttpResponse<analyticsdata_v1alpha.Schema$RunReportResponse>> {
        try {
            const data = await GoogleAnalyticsService.getDeviceCategory();
            return HttpResponse.success(data);
        } catch (e) {
            logger(e);
        }
        return HttpResponse.fail(undefined, StatusCodes.INTERNAL_SERVER_ERROR, "Internal server error");
    }
}

const _ = new GetDeviceCategoryController();
export {_ as GetDeviceCategoryController}