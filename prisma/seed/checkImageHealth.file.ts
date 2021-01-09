import cliProgress from 'cli-progress';
import fs from 'fs';
import request from 'request';
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
    const userProcessBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let seededUser = 0;
    const list: any[] = Object.values(json);
    const newList: any[] = [];
 
    fs.writeFileSync("processed-profile.json", JSON.stringify(newList));

    userProcessBar.start(list.length, seededUser);
    for (let [index, object] of Array.from(list.entries())) {
        let images = object['user']?.['photos'] as any[] ?? [];
        const newImages: any[] = [];
        await Promise.all(
            images.map(async (image) => {
                if (await checkImageHealth(image['url'])) {
                    newImages.push(image);
                }
            })
        )
        object['user']['photos'] = newImages;

        console.log(`\n`)
        console.log(`${index}/${list.length}: ${images.length} => ${newImages.length}`)
        
        if (newImages.length >= 1) {
            newList.push(object);
        }
 
        fs.writeFileSync("processed-profile.json", JSON.stringify(newList));

        userProcessBar.update(++seededUser);
    }
    
    userProcessBar.stop();
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

seedRealUser();