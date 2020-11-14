import { PrismaClient } from "@prisma/client";
import { exit } from "process";
import { DefaultRole } from "../../src/model/role";
import { PasswordHandler } from "../../src/utils/passwordHandler";
import { seedAppConfig } from "./appConfig.seed";
import { seedRole } from "./role.seed";
import { seedUser } from "./user.seed";

const seed = async () => {
    const db = new PrismaClient();
    await seedAppConfig();
    console.log('Seeded App configs');
    await seedRole();
    await db.user.create({
        data: {
            nickName: 'Hien',
            password: PasswordHandler.encode('abc123456'),
            birthday: new Date(1998, 1, 1),
            gender: 'male',
            allowMatching: false,
            introduction: 'Hien Pro',
            avatar: {
                create: {
                    type: 'image',
                    url: 'https://avatars3.githubusercontent.com/u/36977998?s=460&u=7c2d7d85fb631b8e71df22c7f0949a67cbd78e9b&v=4'
                }
            },
            role: { connect: { id: DefaultRole.admin.id } },
            socialProvider: {
                create: {
                    id: 'hienlh1298@gmail.com',
                    type: 'email',
                }
            }
        }
    });
    console.log('Seeded Admin User');

    await seedUser();
}

seed().then(() => {
    exit(0);
}).catch(e => {
    console.error(e);
    exit(1);
})