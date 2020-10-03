import { PrismaClient } from "@prisma/client";
import { Config } from "../../src/config";

export const seedAppConfig = async () => {
    const db = new PrismaClient();
    return await Promise.all(
        Object.keys(Config).map(async (e, i) => {
            return await db.appConfig.create({
                data: {
                    id: e,
                    name: e,
                    data: Object.values(Config)[i]
                }
            })
        })
    )
};