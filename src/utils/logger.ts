import { Config } from "../config";

export const logger = (message: any) => {
    if (Config.debugLog)
        console.log(message);
}