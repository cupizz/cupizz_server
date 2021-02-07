import removeTempFile from './tempFile.cron'
import trainModelRecommend from './trainModel.cron'

export const runCronJob = () => {
    removeTempFile();
    trainModelRecommend();
}