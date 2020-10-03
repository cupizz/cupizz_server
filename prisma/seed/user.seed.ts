import { PrismaClient, PrivateField, Gender, MustHaveField } from "@prisma/client";
import faker from 'faker';
import { Config } from "../../src/config";
import { DefaultRole } from "../../src/model/role";
import { PasswordHandler } from "../../src/utils/passwordHandler";
import cliProgress from 'cli-progress';

export const seedUser = async () => {
    const db = new PrismaClient();
    const userProcessBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let seededUser = 0;
    console.log('Seeding users: ');
    userProcessBar.start(200, seededUser);

    await Promise.all(Array.from(Array(200).keys())
        .map(async (_) => {
            const minAgePrefer = faker.random.number({ min: Config.minAge, max: Config.maxAge });
            const maxAgePrefer = faker.random.number({ min: minAgePrefer, max: Config.maxAge });
            const minHeightPrefer = faker.random.number({ min: Config.minHeight, max: Config.maxHeight });
            const maxHeightPrefer = faker.random.number({ min: minHeightPrefer, max: Config.maxHeight });

            await db.user.create({
                data: {
                    nickName: faker.name.firstName(),
                    introduction: faker.lorem.sentence(),
                    password: PasswordHandler.encode('123456789'),
                    birthday: faker.date.between(1920, "2010"),
                    gender: getRandomSubarray(Object.values(Gender), 1)[0],
                    hobbies: Array.from(Array(faker.random.number(10)).keys()).map(_ => faker.lorem.word()).join(Config.listSeparateSymbol),
                    phoneNumber: faker.phone.phoneNumber(),
                    job: faker.name.jobTitle(),
                    height: faker.random.number({ min: 150, max: 200 }),
                    privateFields: { set: getRandomSubarray(Object.values(PrivateField), faker.random.number(Object.values(PrivateField).length)) },
                    minAgePrefer,
                    maxAgePrefer,
                    minHeightPrefer,
                    maxHeightPrefer,
                    genderPrefer: { set: getRandomSubarray(Object.values(Gender), faker.random.number({ min: 1, max: Object.values(Gender).length })) },
                    distancePrefer: faker.random.number({ min: Config.minDistance, max: Config.maxDistance }),
                    mustHaveFields: { set: getRandomSubarray(Object.values(MustHaveField), faker.random.number(Object.values(MustHaveField).length)) },
                    allowMatching: faker.random.boolean(),
                    isPrivate: faker.random.boolean(),
                    showActive: faker.random.boolean(),
                    avatar: {
                        create: {
                            type: 'image',
                            url: faker.image.avatar()
                        }
                    },
                    userImage: { create: Array.from(Array(faker.random.number(9)).keys()).map(_ => ({ image: { create: { type: 'image', url: faker.image.people() } } })) },
                    lastOnline: faker.date.recent(),
                    role: { connect: { id: faker.random.boolean() ? DefaultRole.normal.id : DefaultRole.trial.id } },
                    socialProvider: {
                        create: {
                            id: faker.internet.email(faker.random.word()),
                            type: 'email',
                        }
                    },
                }
            })
            userProcessBar.update(++seededUser);
        }));
    userProcessBar.stop();

    const allUser = await db.user.findMany();
    const friendProcessBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let seededFriends = 0;
    console.log('Seeding friends: ');
    friendProcessBar.start(allUser.length, seededFriends);

    for (const user of allUser) {
        await Promise.all(
            getRandomSubarray(allUser, faker.random.number(allUser.length / 2))
                .map(async other => {
                    try {
                        if ((await db.friend.findMany({
                            where: {
                                OR: [
                                    { senderId: user.id, receiverId: other.id },
                                    { senderId: other.id, receiverId: user.id },
                                ]
                            }
                        })).length === 0 && user.id !== other.id) {
                            await db.friend.create({
                                data: {
                                    sender: { connect: { id: user.id } },
                                    receiver: { connect: { id: other.id } },
                                    isSuperLike: faker.random.boolean(),
                                    acceptedAt: faker.random.boolean() ? faker.date.past() : null
                                }
                            })
                        }
                    } catch (_) { }
                })
        )
        friendProcessBar.update(++seededFriends)
    }
    friendProcessBar.stop();
};

function getRandomSubarray<T>(arr: T[], size: number): T[] {
    var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}