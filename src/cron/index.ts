import removeTempFile from './tempFile.cron'

export const runCronJob = () => {
    removeTempFile();
}