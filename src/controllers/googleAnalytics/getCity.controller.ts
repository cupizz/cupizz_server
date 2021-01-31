import e from "express";
import {logger} from "../../utils/logger";
import {StatusCodes} from "http-status-codes";
import {analyticsdata_v1alpha} from "googleapis";
import {GoogleAnalyticsService} from "../../service";
import {BaseController, HttpResponse} from "@cores/http";

class GetCityController extends BaseController<any> {
    protected async execute(req: e.Request, res: e.Response): Promise<HttpResponse<analyticsdata_v1alpha.Schema$RunReportResponse>> {
        try {
            const data = await GoogleAnalyticsService.getCity();
            return HttpResponse.success(data);
        } catch (e) {
            logger(e);
        }
        return HttpResponse.fail(undefined, StatusCodes.INTERNAL_SERVER_ERROR, "Internal server error");
    }
}

const _ = new GetCityController();
export {_ as GetCityController}