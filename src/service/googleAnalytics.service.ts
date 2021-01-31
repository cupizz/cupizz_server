import GoogleAnalyticsClient from "../utils/googleAnalyticsClient";
import {analyticsdata_v1alpha} from "googleapis";
import moment from "moment";

const DEFAULT_STRING_FORMAT_DATE = 'YYYY-MM-DD';
export type QueryReportGoogleAnalytic = {
    startDate?: Date;
    endDate?: Date;
    metrics?: analyticsdata_v1alpha.Schema$Metric[];
    dimensions?: analyticsdata_v1alpha.Schema$Dimension[];
    dimensionFilter?: analyticsdata_v1alpha.Schema$FilterExpression;
    orderBys?: analyticsdata_v1alpha.Schema$OrderBy[];
}

class GoogleAnalyticsService {
    public async getPlatform(): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const data = await this.queryReport({
            startDate: new Date(2020, 11, 25),
            endDate: new Date(),
            dimensions: [
                {
                    name: "platform"
                },
            ],
            metrics: [
                {
                    name: "activeUsers",
                },
                {
                    name: "userEngagementDuration"
                },
                {
                    name: "totalRevenue"
                }
            ],
        });
        return data;
    }

    public async getTimeLineLastWeek(): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const now = new Date();
        const data = await this.queryReport({
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
            endDate: now,
            dimensions: [
                {
                    name: "date"
                },
            ],
            metrics: [
                {
                    name: "activeUsers",
                },
                {
                    name: "screenPageViews"
                },
                {
                    name: "newUsers"
                },
                {
                    name: "eventCount"
                }
            ],
            orderBys : [
                {
                    dimension: {
                        dimensionName: 'date',
                        orderType: '1'
                    }
                }
            ]
        });
        return data;
    }

    public async getGender(): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const data = await this.queryReport({
            startDate: new Date(2020, 11, 25),
            endDate: new Date(),
            dimensions: [
                {
                    name: "userGender"
                },
            ],
            metrics: [
                {
                    name: "activeUsers",
                },
            ],
        });
        return data;
    }

    public async getDeviceCategory(): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const data = await this.queryReport({
            startDate: new Date(2020, 11, 25),
            endDate: new Date(),
            dimensions: [
                {
                    name: "deviceCategory"
                },
            ],
            metrics: [
                {
                    name: "activeUsers",
                },
            ],
        });
        return data;
    }

    public async getSessionByDay(payload: {
        startDate?:Date,
        endDate?: Date
    }): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const data = await this.queryReport({
            startDate: payload.startDate ? payload.startDate : new Date(2020, 11, 25),
            endDate: payload.endDate ? payload.endDate : new Date(),
            dimensions: [
                {
                    name: "date"
                },
            ],
            metrics: [
                {
                    name: "sessions",
                },
            ],
            orderBys : [
                {
                    dimension: {
                        dimensionName: 'date',
                        orderType: '1'
                    }
                }
            ]
        });
        return data;
    }

    public async getCity(): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const data = await this.queryReport({
            startDate: new Date(2020, 11, 25),
            endDate: new Date(),
            dimensions: [
                {
                    name: "city"
                },
            ],
            metrics: [
                {
                    name: "activeUsers",
                },
            ],
        });
        return data;
    }

    public async getCountry(): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const data = await this.queryReport({
            startDate: new Date(2020, 11, 25),
            endDate: new Date(),
            dimensions: [
                {
                    name: "country"
                },
            ],
            metrics: [
                {
                    name: "activeUsers",
                }
            ],
        });
        return data;
    }

    public queryReport(params: QueryReportGoogleAnalytic): Promise<analyticsdata_v1alpha.Schema$RunReportResponse> {
        const {startDate, endDate, metrics, dimensions, dimensionFilter, orderBys} = params;
        return GoogleAnalyticsClient.v1alpha.runReport({
            requestBody: {
                entity: {
                    propertyId: "252841631",
                },
                dateRanges: [
                    {
                        startDate: moment(startDate).format(DEFAULT_STRING_FORMAT_DATE),
                        endDate: moment(endDate).format(DEFAULT_STRING_FORMAT_DATE),
                    },
                ],
                metrics,
                dimensions,
                dimensionFilter,
                orderBys
            },
        }).then((res) => {
            return res.data;
        });
    }
}

const _ = new GoogleAnalyticsService();
export {_ as GoogleAnalyticsService}