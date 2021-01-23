import { PrismaClient } from "@prisma/client";
import cliProgress from 'cli-progress';
import cloudinary from 'cloudinary';
import faker from 'faker/locale/vi';
import request from 'request';

export const reuploadTinderImages = async () => {
    console.log('Loading all tinder image in server...');
    const db = new PrismaClient();
    const images = await db.file.findMany({
        where: { url: { contains: 'tinder' } }
    })
    console.log(`Loaded ${images.length} images`);

    const processBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let process = 0;
    processBar.start(images.length, process);

    var i, j, temparray, chunk = 10;
    for (i = 0, j = images.length; i < j; i += chunk) {
        temparray = images.slice(i, i + chunk);
        await Promise.all(temparray.map(async (image) => {
            // Check image is accessable
            if (!await checkImageHealth(image.url)) {
                // Update with a random image
                const newImage = getRandomImage();
                await db.file.update({
                    where: { id: image.id },
                    data: { url: newImage, thumbnail: newImage }
                })
            } else {
                try {
                    // Upload images
                    const result = await new Promise<cloudinary.UploadApiResponse>((res, rej) => {
                        cloudinary.v2.uploader.upload(
                            image.url,
                            {
                                folder: 'tinder_images',
                            },
                            (e, result) => {
                                if (e) rej(e);
                                else {
                                    res(result);
                                }
                            })
                    })
                    // Update db
                    await db.file.update({
                        where: { id: image.id },
                        data: { url: result.url, thumbnail: result.url }
                    })
                } catch (e) {
                    console.log(`\nError in image ${image.id} (${image.url}): ${JSON.stringify(e)}`);
                }
            }
            processBar.update(++process)
        }))
        // do whatever
    }

    processBar.stop();
    console.log('Done');
};

function getRandomImage(scale: number = 1): string {
    const height = faker.random.number({ min: 640 * scale, max: 1280 * scale });
    const width = faker.random.number({ min: 640 * scale, max: 1280 * scale });
    return `https://loremflickr.com/${height}/${width}/girl?lock=${faker.random.number(10000)}`
}

async function checkImageHealth(url: string): Promise<Boolean> {
    try {
        await new Promise((res, rej) => {
            request.get({
                url: url,
                callback: (e, response) => {
                    if (e || response.statusCode >= 400) {
                        rej(e);
                    } else {
                        res(response);
                    }
                },
                timeout: 10000
            })
        });
    } catch (error) {
        return false;
    }
    return true;
}

reuploadTinderImages();