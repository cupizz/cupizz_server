import { ConfigType, loadConfig } from '../config';
import { prisma } from '../server';

class AppConfigService {
    public async update(config: ConfigType) {
        await Promise.all(
            Object.keys(config).map(async (e, i) => {
                return await prisma.appConfig.upsert({
                    where: { id: e },
                    create: {
                        id: e,
                        name: e,
                        data: Object.values(config)[i].value,
                        description: Object.values(config)[i].description
                    },
                    update: {
                        id: e,
                        name: e,
                        data: Object.values(config)[i].value,
                        description: Object.values(config)[i].description
                    }
                })
            }));

        return await loadConfig();
    }
}

const _ = new AppConfigService();
export { _ as AppConfigService };