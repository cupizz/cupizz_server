import { PrismaClient, UserCreateArgs } from "@prisma/client";
import cliProgress from 'cli-progress';
import faker from 'faker/locale/vi';
import fs from 'fs';
import { DefaultRole } from "../../src/model/role";
import { PasswordHandler } from "../../src/utils/passwordHandler";
const json = require('big-json');

export const seedRealUser = async () => {
    console.log('Seeding real users: ');

    const readStream = fs.createReadStream(process.env.PWD + '/prisma/seed/profiles.json');
    const parseStream = json.createParseStream();

    console.log('Loading json file...');
    parseStream.on('data', _createUsers);

    readStream.pipe(parseStream);
};

const _createUsers = async (json: any[]) => {
    const db = new PrismaClient();
    const allHobbies = await db.hobbyValue.findMany();
    const userProcessBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let seededUser = 0;
    const list: any[] = Object.values(json);
    userProcessBar.start(list.length, seededUser);

    for (let i = 0; i < list.length; i++) {
        const object = list[i];
        let images = object['user']?.['photos'] as any[] ?? [];
        const avatar = images.length > 0 ? images.pop() : null;
        const cover = images.length > 1 ? images.pop() : null;
        if (images.length === 0)
            images.push(
                ...Array.from(Array(faker.random.number(9)).keys())
                    .map(_ => getRandomImage())
            )
        const city = object?.['user']?.['city']?.['name'];

        const data: UserCreateArgs = {
            data: {
                nickName: object['user']?.['name'] ?? faker.name.findName(),
                introduction: object['user']?.['bio'] ?? faker.lorem.sentence(),
                password: PasswordHandler.encode(faker.lorem.word()),
                birthday: new Date(object['user']?.['birth_date']) ?? faker.date.between("1980", "2010"),
                gender: object['user']?.['gender'] === 1 ? 'female' : object['user']?.['gender'] === 0 ? 'male' : 'other',
                hobbies: {
                    connect: getRandomSubarray(allHobbies, faker.random.number(allHobbies.length - 1)).map(e => ({ id: e.id }))
                },
                phoneNumber: '',
                job: object['teaser']?.['type'] === 'job' ? object['teaser']?.['string'] ?? '' : '',
                allowMatching: true,
                isPrivate: false,
                pushNotiSetting: ['like', 'matching', 'newMessage', 'other'],
                showActive: true,
                address: city,
                avatar: {
                    create: {
                        type: 'image',
                        url: avatar?.['url'] ?? getRandomImage(0.5),
                        thumbnail: avatar?.['processedFiles']?.[0]?.['url'],
                    }
                },
                cover: {
                    create: {
                        type: 'image',
                        url: cover?.['url'] ?? getRandomImage(0.5),
                        thumbnail: cover?.['processedFiles']?.[0]?.['url'],
                    }
                },
                userImages: {
                    create: images.map((image) => ({
                        image: {
                            create: {
                                type: 'image',
                                url: image?.['url'] ?? getRandomImage(0.5),
                                thumbnail: image?.['processedFiles']?.[0]?.['url'],
                            }
                        }
                    }))
                },
                lastOnline: faker.date.recent(),
                role: { connect: { id: DefaultRole.tester.id } },
                socialProvider: {
                    create: {
                        id: `tinder${i}@cupizz.cf`,
                        type: 'email',
                    }
                },
            }
        };
        await db.user.create(data)
        userProcessBar.update(++seededUser);
    }
    userProcessBar.stop();
}

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

seedRealUser();