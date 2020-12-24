import { mutationField } from "@nexus/schema";
import { inputObjectType, NexusInputFieldConfig } from "@nexus/schema/dist/core";
import { ConfigField } from "../../config";
import { AppConfigService } from "../../service/appConfig.service";

const args: Record<ConfigField, NexusInputFieldConfig<ConfigField, ConfigField>> = {
    debugLog: { type: 'Boolean' },
    defaultPageSize: { type: 'Int' },
    loginTokenExpireTime: { type: 'Int' },
    maxFilesUpload: { type: 'Int' },
    maxPaginationSize: { type: 'Int' },
    maxUserImage: { type: 'Int' },
    ngWords: { type: 'String', list: true },
    otpExpireTime: { type: 'Int' },
    registerExpireTime: { type: 'Int' },
    tempPath: { type: 'String' },
    trialTime: { type: 'Int' },
    forgotPassTokenExpireTime: { type: 'Int' },
    minAge: { type: 'Int' },
    maxAge: { type: 'Int' },
    minDistance: { type: 'Int' },
    maxDistance: { type: 'Int' },
    minHeight: { type: 'Int' },
    maxHeight: { type: 'Int' },
}

export const updateAppConfigMutation = mutationField('adminUpdateAppConfigV2', {
    type: 'AppConfig',
    list: true,
    args: (() => {
        const result: any = {};
        Object.keys(args).forEach(e => {
            const config = (args as any)[e];
            result[e] = inputObjectType({
                name: `${e}InputType`,
                definition(t) {
                    t.field('value', config)
                    t.field('description', { type: 'String' })
                }
            })
        })
        return result;
    })(),
    resolve: async (_root, args: any, _ctx, _info) => {
        return await AppConfigService.update(args);
    }
})