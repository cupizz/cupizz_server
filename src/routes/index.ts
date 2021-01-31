import e, {Router} from "express";
import {GoogleAnalyticsRoute} from "./googleAnalytics.route";
import {StatusCodes} from "http-status-codes";

// Init router and path
const router = Router();

router.use('/analytics/google', GoogleAnalyticsRoute.get());

// All other Routes are 404
router.use((req: e.Request, res: e.Response, next: e.NextFunction) => {
    res.status(StatusCodes.NOT_FOUND).send('API not found!!!');
});

export default router;