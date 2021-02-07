import {logger} from '../utils/logger';
import {RecommendService} from "../service/recommend.service";
import {prisma} from "../server";

export default () => {
    const CronJob = require('cron').CronJob;
    // “At 00:00.”
    const job = new CronJob('0 0 * * *', async () => {
        RecommendService.trainModelRecommend().then(() => {
            prisma.recommendableUser.deleteMany({

            }).then(()=>{
                logger('Train mode at: ' + new Date());
            });

        }).catch((error) => {
            logger(error);
        });
    }, null, true, 'America/Los_Angeles');
    job.start();
}