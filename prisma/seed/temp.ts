import { PrismaClient } from "@prisma/client";
import cliProgress from 'cli-progress';

export const reuploadTinderImages = async () => {
    console.log('Loading items...');
    const db = new PrismaClient();
    const data = await db.file.findMany({
        where: {
            url: {contains: 'http://res.cloudinary'}
        }
    })
    console.log(`Loaded ${data.length} items`);

    const processBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let process = 0;
    processBar.start(data.length, process);

    var i, j, temparray, chunk = 10;
    for (i = 0, j = data.length; i < j; i += chunk) {
        temparray = data.slice(i, i + chunk);
        await Promise.all(temparray.map(async (item) => {
            await db.file.update({
                where: { id: item.id },
                data: {
                    url: item.url.replace('http://', 'https://'),
                    thumbnail: item.thumbnail.replace('http://', 'https://'),
                }
            })
            processBar.update(++process)
        }))
        // do whatever
    }

    processBar.stop();
    console.log('Done');
};

reuploadTinderImages();