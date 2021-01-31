import e from "express";
import {GoogleAnalyticsService} from "../../service";
import {logger} from "../../utils/logger";
import {StatusCodes} from "http-status-codes";
import {analyticsdata_v1alpha} from "googleapis";
import {BaseController, HttpResponse} from "@cores/http";

class GetSessionByDayController extends BaseController<any> {
    protected async execute(req: e.Request, res: e.Response): Promise<HttpResponse<analyticsdata_v1alpha.Schema$RunReportResponse>> {
        try {
            const startDate = req.query.startDate ? new Date(parseInt(req.query.startDate as string, 10)) : undefined;
            const endDate = req.query.endDate ? new Date(parseInt(req.query.endDate as string, 10)): undefined;
            const data = await GoogleAnalyticsService.getSessionByDay({
                startDate,
                endDate
            });
            return HttpResponse.success(data);
        } catch (e) {
            logger(e);
        }
        return HttpResponse.fail(undefined, StatusCodes.INTERNAL_SERVER_ERROR, "Internal server error");
    }
}

const _ = new GetSessionByDayController();
export {_ as GetSessionByDayController}