import { PrismaClient } from '@prisma/client'

const _Config = {
    debugLog: true,
    otpExpireTime: '1m',
    registerExpireTime: '20m',
    tempPath: __dirname + '/../temp/',
    maxFilesUpload: 10,
    defaultPageSize: 1,
    listSeparateSymbol: '|',
    minAge: 18,
    maxAge: 100,
    minHeight: 150, // cm
    maxHeight: 200, // cm
    minDistance: 5, // km
    maxDistance: 500, // km
}

let _configFromDb = _Config;

export const  loadConfig = async () => {
    const listConfig = await (new PrismaClient()).appConfig.findMany();
    const result: any = {};
    listConfig.forEach(e => result[e.id] = e.data);
    _configFromDb = result;
}

export const Config = _configFromDb;