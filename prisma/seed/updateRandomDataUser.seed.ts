import {PrismaClient} from "@prisma/client";
import cliProgress from 'cli-progress';
import faker from 'faker/locale/vi';

export const updateRandomDataUser = async () => {
    console.log('Loading tinder users that do not have location in server...');
    const db = new PrismaClient();
    const users = await db.user.findMany({
        where: {
            latitude: {equals: null},
            OR: [
                {
                    longitude: {equals: null},
                },
                {
                    height: { equals: null}
                }
            ]

        }
    })

    const processBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let process = 0;
    processBar.start(users.length, process);

    var i, j, temparray, chunk = 10;
    for (i = 0, j = users.length; i < j; i += chunk) {
        temparray = users.slice(i, i + chunk);
        await Promise.all(temparray.map(async (user) => {
            await db.user.update({
                where: {id: user.id},
                data: {
                    longitude: parseFloat(faker.address.longitude(107.019444, 106.023611)),
                    latitude: parseFloat(faker.address.latitude(11.371389, 10.375833)),
                    height: faker.random.number({min: 140, max: 200}),
                }
            })
            processBar.update(++process)
        }))
        // do whatever
    }

    processBar.stop();
    console.log('Done');
};

updateRandomDataUser();