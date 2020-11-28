import { File, PrismaClient } from '@prisma/client';
import { Context } from './context';

export const defaultAvatar = (ctx: Context): File => ({ id: "0", type: 'image', url: ctx.hostUrl + '/assets/default-avatar.png', thumbnail: null, messageId: null });

export const ConstConfig = {
    port: process.env.PORT || 2020,
    listSeparateSymbol: '|'
}

export type ConfigField = 'debugLog'
    | 'loginTokenExpireTime'
    | 'otpExpireTime'
    | 'registerExpireTime'
    | 'tempPath'
    | 'maxFilesUpload'
    | 'defaultPageSize'
    | 'maxPaginationSize'
    | 'maxUserImage'
    | 'trialTime'
    | 'ngWords'
    | 'minAge'
    | 'maxAge'
    | 'minHeight'
    | 'maxHeight'
    | 'minDistance'
    | 'maxDistance';

export type ConfigType = Record<ConfigField, { value: any, description: string }>;

const _Config: ConfigType = {
    debugLog: { value: true, description: "Bật tắt console log" },
    loginTokenExpireTime: { value: 24 * 60, description: 'Thời gian hết hạn của token đăng nhập. (Tính theo phút)' },
    otpExpireTime: { value: 1, description: 'Thời gian hết hạn của token OTP. (Tính theo phút)' },
    registerExpireTime: { value: 20, description: 'Thời gian hết hạn của token đăng ký. (Tính theo phút)' },
    tempPath: { value: __dirname + '/../temp/', description: 'Đường dẫn thư mục lưu file temp. (Lưu ý phải tồn tại trên server)' },
    maxFilesUpload: { value: 11, description: 'Số lượng file upload tối đa' },
    defaultPageSize: { value: 10, description: 'Số lượng phần tử mặc định trên 1 trang' },
    maxPaginationSize: { value: 100, description: 'Số lượng phần tử tối đa trên 1 trang' },
    maxUserImage: { value: 9, description: 'Số lượng hình ảnh tối đa của mỗi người dùng' },
    trialTime: { value: 24 * 60 * 60, description: 'Thời gian dùng thử. (Tính theo phút)' },
    ngWords: { value: ["死ね", "殺す"].join(ConstConfig.listSeparateSymbol), description: 'Từ cấm' },
    minAge: { value: 18, description: '' },
    maxAge: { value: 100, description: '' },
    minHeight: { value: 150, description: '' },
    maxHeight: { value: 200, description: '' },
    minDistance: { value: 5, description: '' },
    maxDistance: { value: 500, description: '' },
}

let _configFromDb = _Config;

export const loadConfig = async () => {
    const listConfig = await (new PrismaClient()).appConfig.findMany();
    const result: any = {};
    listConfig.forEach(e => result[e.id] = e.data);
    _configFromDb = result;
}

export const Config = _configFromDb;