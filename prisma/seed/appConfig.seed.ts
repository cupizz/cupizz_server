import { PrismaClient } from "@prisma/client";

export const seedAppConfig = async () => {
    const db = new PrismaClient();
    return await Promise.all(
        [
            db.appConfig.create({
                data: {
                    id: 'default_hobbies',
                    name: 'Default Hobbies',
                    data: [
                        'Bay',
                    ]
                }
            }),
        ]
    )
};