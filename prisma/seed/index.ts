import { PrismaClient } from "@prisma/client";
import { exit } from "process";
import { PasswordHandler } from "../../src/utils/passwordHandler";
import { seedArea } from "./area.seed";
import { seedRole } from "./role.seed";
import { DefaultRole } from "../../src/model/role";

const seed = async () => {
    const db = new PrismaClient();
    await seedArea();
    await seedRole()
    return await db.user.create({
        data: {
            nickName: 'Hien',
            password: PasswordHandler.encode('abc123456'),
            birthday: new Date(1998, 1, 1),
            genderBorn: 'male',
            gender: 'male',
            bodies: { set: ['asdasd'] },
            personalities: { set: ['adasdas'] },
            hobbies: { set: ['asdasda'] },
            introduction: 'Hien Pro',
            agesOtherPerson: { set: ['20', '30'] },
            genderBornOtherPerson: { set: ['female'] },
            genderOtherPerson: { set: ['female'] },
            area: { connect: { id: 1 } },
            city: { create: { city: 'Tokio', area: { connect: { id: 1 } } } },
            identifyImage: {
                create: {
                    type: 'image',
                    url: 'https://avatars3.githubusercontent.com/u/36977998?s=460&u=7c2d7d85fb631b8e71df22c7f0949a67cbd78e9b&v=4',
                }
            },
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
                    email: 'hienlh1298@gmail.com',
                }
            }
        }
    });
}

seed().then(() => {
    exit(0);
}).catch(e => {
    console.error(e);
    exit(1);
})