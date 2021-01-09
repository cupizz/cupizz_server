import { arg, mutationField } from "@nexus/schema";
import { FileService } from "../../service/file.service";

export const UploadTempFileMutation = mutationField('uploadTempFile', {
    type: 'String',
    list: true,
    description: 'Trả về danh sách id của temp file',
    args: {
        files: arg({ type: 'Upload', list: true, nullable: false })
    },
    resolve: async (_root, args, _ctx, _info) => {
        return await FileService.uploadMultiTemp(await Promise.all(args.files ?? []));
    }
})