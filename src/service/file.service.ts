import * as request from 'request';
import { FileUpload } from 'graphql-upload';
import * as fs from 'fs';
import uniqueId from 'uniqid';
import { FileCreateInput } from '@prisma/client';
import { Config } from '../config';
import { ClientError } from '../model/error';
import Strings from '../constants/strings';
import { logger } from '../utils/logger';

class FileService {
    public async upload(file: FileUpload): Promise<FileCreateInput> {
        this._validateFile(file);
        const fileType = file.mimetype.split('/')[0];
        if (fileType === 'image') {
            const tempFile = await this.uploadTemp(file);
            let data = await this._uploadOneImageToImgur(tempFile);
            return {
                type: 'image',
                ...data
            };
        }
    }

    public async uploadMulti(files: FileUpload[]): Promise<FileCreateInput[]> {
        return Promise.all(files.map(e => this.upload(e)));
    }

    public async uploadFromTemp(fileName: string): Promise<FileCreateInput> {
        const data = await this._uploadOneImageToImgur(fileName);
        logger('Uploaded from temp: ' + data.url + ' from ' + fileName);
        return {
            type: 'image',
            ...data
        };
    }

    public uploadMultiFromTemp(fileNames: string[]): Promise<FileCreateInput[]> {
        return Promise.all(fileNames.map(e => this.uploadFromTemp(e)));
    }

    public async uploadTemp(file: FileUpload): Promise<string> {
        await this._validateFile(file);
        const { createReadStream } = file;
        const readStream = createReadStream();
        const tempFileName = uniqueId() + '.' + file.mimetype.split('/')[1];
        const tempFilePath = Config.tempPath.value + tempFileName;

        let writeTo = fs.createWriteStream(tempFilePath)
        readStream.pipe(writeTo)

        await new Promise((resolve, reject) => {
            readStream.on('error', reject);
            readStream.on('end', resolve);
        })
        writeTo.end();
        logger('Uploaded temp ' + tempFileName);
        return tempFileName;
    }

    public async uploadMultiTemp(files: FileUpload[]): Promise<string[]> {
        return Promise.all(files.map(e => this.uploadTemp(e)));
    }

    public validateTempFiles(fileNames: string[]) {
        fileNames.forEach(e => {
            if (!fs.existsSync(Config.tempPath.value + e))
                throw ClientError(Strings.error.tempFileNotFound(e));
        })
    }

    private async _validateFile(file: FileUpload) {
        const fileType = file?.mimetype?.split('/')?.[0];
        const fileExt = file?.mimetype?.split('/')?.[1];

        if (fileType != 'image')
            throw new Error(`File type ${file.mimetype} does not support`);
    }

    private _uploadManyImageToImgur(tempFileNames: string[]): Promise<{ url: string, thumbnail: string }[]> {
        return Promise.all(tempFileNames.map(e => this._uploadOneImageToImgur(e)))
    }

    private async _uploadOneImageToImgur(tempFileName: string): Promise<{ url: string, thumbnail: string }> {
        let tempFilePath = '';
        // return {thumbnail: 'Test', url: 'Test'};
        const res = await new Promise<request.Response>(async (resolve, reject) => {
            try {
                tempFilePath = Config.tempPath.value + tempFileName;
                if (!fs.existsSync(tempFilePath)) {
                    reject(new Error('Can not read temp file ' + tempFileName));
                }
                let image;
                image = fs.createReadStream(tempFilePath);

                request.post({
                    url: 'https://api.imgur.com/3/image',
                    headers: {
                        authorization: 'Client-ID 2e284addcc9fff2'
                    },
                    formData: { image },
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
            }
        })

        const decoded = JSON.parse(res.body);

        if (decoded.status != 200) {
            logger(decoded);
            throw new Error('Upload image to imgur failed. ' + decoded?.data?.error?.message || decoded?.data?.error);
        }
        const url = decoded?.data?.link ?? '';

        fs.unlinkSync(tempFilePath);
        
        return {
            url,
            thumbnail: this._getImgurThumbnail(url)
        };
    }

    private _getImgurThumbnail(url: string): string {
        try {
            const id = url.split('/').pop().split('.')[0];
            if (id.length !== 7) {
                throw 'Id incorrect';
            }
            return `https://i.imgur.com/${id}m.jpg`;
        } catch (_) {
            return url;
        }
    }
}

const _ = new FileService();
export { _ as FileService }