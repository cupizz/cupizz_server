import fs from 'fs';
import { Config } from '../config';
import { logger } from '../utils/logger';

export default () => {
    var CronJob = require('cron').CronJob;
    // Hourly
    var job = new CronJob('0 * * * *', async () => {
        fs.readdir(Config.tempPath.value, (err, fileNames) => {
            if (err) {
                console.error('CronJob remove temp file Error:', err);
                return;
            }

            // Chỉ xóa các file cách đây 1h
            fileNames.forEach(e => {
                const fileCreatedAt = new Date(fs.statSync(Config.tempPath.value + e).birthtime);
                if (Date.now() - fileCreatedAt.getTime() >= 60 * 60 * 1000) {
                    fs.unlinkSync(Config.tempPath.value + e);
                }
            });

            logger('Removed all temp files');
        })
    }, null, true, 'America/Los_Angeles');
    job.start();
}