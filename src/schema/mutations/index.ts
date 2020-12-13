import { arg, idArg, mutationType, stringArg } from '@nexus/schema'
import { Permission } from '../../model/permission'
import { AuthService, FileService, OnesignalService } from '../../service'

export * from './auth.mutation'
export * from './message.mutation'
export * from './file.mutation'
export * from './user.mutation'

export const mutations = mutationType({
    definition(t) {
        t.field('adminSendNotification', {
            type: 'Boolean',
            args: {
                userIds: idArg({ list: true, description: 'List rỗng sẽ gửi cho tất cả user.', required: true }),
                title: stringArg({ required: true }),
                subtitle: stringArg(),
                content: stringArg({ required: true }),
                image: arg({ type: 'Upload' }),
            },
            resolve: async (_root, args, ctx) => {
                AuthService.authorize(ctx, { values: [Permission.user.list] });
                let image;
                if(args.image) {
                    image = await FileService.upload(await args.image);
                }

                if (args.userIds.length === 0) {
                    await OnesignalService.sendToAll(args.title, args.content, args.subtitle, image?.url);
                } else {
                    await OnesignalService.sendToUserIds(args.title, args.content, args.userIds, null, args.subtitle, image?.url);
                }
                return true;
            }
        })
    }
}) 