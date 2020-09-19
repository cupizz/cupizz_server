import * as request from 'request';
import { FileUpload } from 'graphql-upload';
import * as fs from 'fs';
import uniqueId from 'uniqid';
import { FileCreateInput } from '@prisma/client';

const __tempPath = __dirname + '/../../temp/'

class FileService {

    public async upload(file: FileUpload): Promise<FileCreateInput> {
        this._validateFile(file);
        const data = await this._uploadOneImageToImgur(file);
        return {
            type: 'image',
            ...data
        };
    }

    public async uploadMulti(files: FileUpload[]): Promise<FileCreateInput[]> {
        return Promise.all(files.map(e => this.upload(e)));
    }

    public async uploadTemp(file: FileUpload): Promise<string> {
        this._validateFile(file);
        const { filename, createReadStream } = file;
        const readStream = createReadStream();
        const tempFileName = uniqueId() + filename;
        const tempFilePath = __tempPath + tempFileName;

        let writeTo = fs.createWriteStream(tempFilePath)
        readStream.pipe(writeTo)

        await new Promise((resolve, reject) => {
            readStream.on('error', reject);
            readStream.on('close', resolve);
        })
        writeTo.end();

        return tempFileName;
    }

    public async uploadMultiTemp(files: FileUpload[]): Promise<string[]> {
        return Promise.all(files.map(e => this.uploadTemp(e)));
    }

    private async _validateFile(file: FileUpload) {
        const fileType = file.mimetype.split('/')[0];
        const fileExt = file.mimetype.split('/')[1];

        if (fileType != 'image')
            throw new Error(`File type ${file.mimetype} does not support`);
    }

    private _uploadManyImageToImgur(files: FileUpload[]): Promise<{ url: string, thumbnail: string }[]> {
        return Promise.all(files.map(e => this._uploadOneImageToImgur(e)))
    }

    private async _uploadOneImageToImgur(file: FileUpload): Promise<{ url: string, thumbnail: string }> {
        let tempFilePath = '';
        const res = await new Promise<request.Response>(async (resolve, reject) => {
            try {
                tempFilePath = __tempPath + await this.uploadTemp(file);

                request.post({
                    url: 'https://api.imgur.com/3/image',
                    headers: {
                        authorization: 'Client-ID eee6fe9fcde03e2'
                    },
                    formData: {
                        image: fs.createReadStream(tempFilePath)
                    },
                    callback: (e, res) => {
                        if (e) {
                            reject(e);
                        } else {
                            resolve(res);
                        }
                    }
                })
            } catch (e) {
                reject(e);
            } finally {
                fs.unlinkSync(tempFilePath);
            }
        })

        const decoded = JSON.parse(res.body);

        if (decoded.status != 200) throw new Error('Upload image to imgur failed');
        const url = JSON.parse(res.body)?.data?.link ?? '';
        return {
            url,
            thumbnail: url // TODO get imgur thumbnail
        };
    }
}

const _ = new FileService();
export { _ as FileService }