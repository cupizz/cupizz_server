import { arg, idArg, mutationType, stringArg } from '@nexus/schema'
import { DefaultConfig } from '../../config'
import { Permission } from '../../model/permission'
import { prisma } from '../../server'
import { AuthService, FileService, OnesignalService } from '../../service'
import { simplePostMutation } from './post.mutation'

export * from './appConfig.mutation'
export * from './auth.mutation'
export * from './file.mutation'
export * from './forgotPass.mutation'
export * from './helper.mutation'
export * from './message.mutation'
export * from './user.mutation'
export * from './post.mutation'

export const mutations = mutationType({
    definition(t) {
        simplePostMutation(t);
        t.field('adminReseedAppConfig', {
            type: 'Boolean',
            resolve: async (_root, _args, ctx) => {
                AuthService.authorize(ctx, { values: [Permission.config.import] });
                await Promise.all(
                    Object.keys(DefaultConfig).map(async (e) => {
                        return await prisma.appConfig.upsert({
                            create: {
                                id: e,
                                name: e,
                                description: (DefaultConfig as any)[e].description,
                                data: (DefaultConfig as any)[e].value,
                            },
                            where: { id: e },
                            update: {
                                id: e,
                                name: e,
                                description: (DefaultConfig as any)[e].description,
                                data: (DefaultConfig as any)[e].value,
                            }
                        })
                    })
                )
                return true;
            }
        })
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
                if (args.image) {
                    image = await FileService.upload(await args.image);
                }

                if (args.userIds.length === 0) {
                    await OnesignalService.sendToAll(args.title, args.content, args.subtitle, image?.url);
                } else {
                    await OnesignalService.sendToUserIds(args.title, args.content, args.userIds, null, { subtitle: args.subtitle, image: image?.url });
                }
                return true;
            }
        })
        t.crud.updateOneAppConfig({
            alias: 'adminUpdateAppConfig',
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.config.update] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.createOneHobbyValue({
            alias: 'adminCreateHobby',
            computedInputs: {
                user: () => undefined
            },
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.hobby.create] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.updateOneHobbyValue({
            alias: 'adminUpdateHobby',
            computedInputs: {
                user: () => undefined
            },
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.hobby.update] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.deleteOneHobbyValue({
            alias: 'adminDeleteHobby',
            // @ts-ignore
            description: 'Xóa mãi mãi, nếu muốn xóa mềm thì update lại trường isValid',
            resolve: async (_root, args, ctx) => {
                AuthService.authorize(ctx, { values: [Permission.hobby.delete] })

                return await prisma.hobbyValue.delete({
                    where: { id: args.where.id },
                });
            }
        })
        t.crud.createOneQuestion({
            alias: 'adminCreateQuestion',
            computedInputs: {
                userAnswer: () => undefined
            },
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.question.create] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.updateOneQuestion({
            alias: 'adminUpdateQuestion',
            computedInputs: {
                userAnswer: () => undefined
            },
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.question.update] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.deleteOneQuestion({
            alias: 'adminDeleteQuestion',
            resolve: async (_root, args, ctx) => {
                AuthService.authorize(ctx, { values: [Permission.question.delete] })
                await prisma.question.update({
                    where: args.where,
                    data: { userAnswer: { deleteMany: {} } }
                })

                return await prisma.question.delete({
                    where: { id: args.where.id },
                });
            }
        })
        t.crud.createOneQnA({
            alias: 'adminCreateQnA',
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.qnA.create] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.updateOneQnA({
            alias: 'adminUpdateQnA',
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.qnA.update] })
                return origin(root, args, ctx, info);
            }
        })
        t.crud.deleteOneQnA({
            alias: 'adminDeleteQnA',
            resolve: async (_root, args, ctx) => {
                AuthService.authorize(ctx, { values: [Permission.qnA.delete] })

                return await prisma.qnA.delete({
                    where: { id: args.where.id },
                });
            }
        })
    }
}) 