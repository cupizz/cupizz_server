import { Gender, MustHaveField, PrismaClient, PrivateField } from "@prisma/client";
import cliProgress from 'cli-progress';
import faker from 'faker/locale/vi';
import { Config } from "../../src/config";
import { DefaultRole } from "../../src/model/role";
import { PasswordHandler } from "../../src/utils/passwordHandler";

export const seedUser = async () => {
    const db = new PrismaClient();
    const userProcessBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let seededUser = 0;
    console.log('Seeding users: ');
    userProcessBar.start(200, seededUser);

    await Promise.all(Array.from(Array(200).keys())
        .map(async (_, i) => {
            const minAgePrefer = faker.random.number({ min: Config.minAge.value, max: 40});
            const maxAgePrefer = faker.random.number({ min: minAgePrefer, max: 40 });
            const minHeightPrefer = faker.random.number({ min: Config.minHeight.value, max: Config.maxHeight.value });
            const maxHeightPrefer = faker.random.number({ min: minHeightPrefer, max: Config.maxHeight.value });
            const allHobbies = await db.hobbyValue.findMany();

            await db.user.create({
                data: {
                    nickName: faker.name.findName(),
                    introduction: faker.lorem.sentence(),
                    password: PasswordHandler.encode('123456789'),
                    birthday: faker.date.between("1980", "2010"),
                    gender: getRandomSubarray(Object.values(Gender), 1)[0],
                    hobbies: {
                        connect: getRandomSubarray(allHobbies, faker.random.number(allHobbies.length - 1)).map(e => ({ id: e.id }))
                    },
                    phoneNumber: faker.phone.phoneNumber(),
                    job: faker.name.jobTitle(),
                    height: faker.random.number({ min: 150, max: 200 }),
                    longitude: parseFloat(faker.address.longitude(109.461634, 102.14394)),
                    latitude: parseFloat(faker.address.latitude(23.392505, 8.562441)),
                    privateFields: { set: getRandomSubarray(Object.values(PrivateField), faker.random.number(Object.values(PrivateField).length)) },
                    minAgePrefer,
                    maxAgePrefer,
                    minHeightPrefer,
                    maxHeightPrefer,
                    genderPrefer: { set: getRandomSubarray(Object.values(Gender), faker.random.number({ min: 1, max: Object.values(Gender).length })) },
                    distancePrefer: faker.random.number({ min: Config.minDistance.value, max: Config.maxDistance.value }),
                    mustHaveFields: { set: getRandomSubarray(Object.values(MustHaveField), faker.random.number(Object.values(MustHaveField).length)) },
                    allowMatching: true,
                    isPrivate: false,
                    pushNotiSetting: ['like', 'matching', 'newMessage', 'other'],
                    showActive: faker.random.boolean(),
                    avatar: {
                        create: {
                            type: 'image',
                            url: getRandomImage(0.5)
                        }
                    },
                    cover: {
                        create: {
                            type: 'image',
                            url: getRandomImage()
                        }
                    },
                    userImages: { create: Array.from(Array(faker.random.number(9)).keys()).map(_ => ({ image: { create: { type: 'image', url: faker.image.people() } } })) },
                    lastOnline: faker.date.recent(),
                    role: { connect: { id: faker.random.boolean() ? DefaultRole.normal.id : DefaultRole.trial.id } },
                    socialProvider: {
                        create: {
                            id: `test${i}@gmail.com`,
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
            getRandomSubarray(allUser, faker.random.number(2))
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

function getRandomImage(scale: number = 1): string {
    const height = faker.random.number({ min: 640 * scale, max: 1280 * scale });
    const width = faker.random.number({ min: 640 * scale, max: 1280 * scale });
    return `https://loremflickr.com/${height}/${width}/girl?lock=${faker.random.number(10000)}`
}