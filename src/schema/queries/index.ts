import { queryType, objectType, stringArg, arg, booleanArg, intArg } from '@nexus/schema';
import { Permission } from '../../model/permission';
import { AuthService, UserService } from '../../service';
import { Validator } from '../../utils/validator';
import request from 'request';
import { universities } from '../../utils/universities';
import { prisma } from '../../server';
import { Config } from '../../config';
export * from './user.query';
export * from './message.query';


export const PublicQueries = queryType({
    definition(t) {
        t.crud.appConfigs({ pagination: false })
        t.field('about', {
            type: objectType({
                name: 'About',
                definition(t) {
                    t.string('appName', { nullable: false })
                    t.string('apiVersion', { nullable: false })
                    t.string('contact')
                }
            }),
            nullable: true,
            resolve: async (_root, _args, _ctx, _info) => {
                return {
                    appName: 'Cupizz',
                    apiVersion: 'v1.0.0',
                    contact: 'hienlh1298@gmail.com'
                };
            }
        })
        t.crud.hobbyValues({ alias: 'hobbies', pagination: { take: true, skip: true } })
        t.crud.users({
            pagination: true,
            filtering: true,
            ordering: true,
            resolve: (root, args, context, info, origin) => {
                AuthService.authorize(context, { values: [Permission.user.list] });
                if (!args.take) {
                    args.take = 10;
                } else {
                    Validator.maxPagination(args.take);
                }

                return origin(root, args, context, info);
            }
        })
        t.field('userCount', {
            type: 'Int',
            args: {
                where: arg({ type: 'UserWhereInput' }),
            },
            resolve: async (_root, args, ctx) => {
                AuthService.authorize(ctx, { values: [Permission.user.list] });
                return await prisma.user.count({ where: args.where })
            }
        })
        t.field('getAddress', {
            type: 'String',
            args: {
                latitude: stringArg({ required: true }),
                longitude: stringArg({ required: true })
            },
            resolve: async (_root, args, ctx) => {
                AuthService.authenticate(ctx);
                return await UserService.getAddress(args.latitude, args.longitude);
            }
        })
        t.field('searchUniversities', {
            type: 'String',
            list: true,
            args: {
                name: stringArg(),
                exactMatch: booleanArg(),
            },
            resolve: async (_root, args) => {
                if (!args.name) return universities;

                if (args.exactMatch) {
                    return universities.filter(e => e.toLowerCase().includes(args.name.toLowerCase()));
                } else {
                    const listKey = args.name.split(' ');
                    return universities.filter(e => {
                        for (const iterator of listKey) {
                            if (e.toLocaleLowerCase().includes(iterator.toLowerCase())) {
                                return true;
                            }
                        }
                        return false;
                    });
                }

            }
        })
        t.field('questions', {
            type: 'Question',
            list: true,
            args: {
                keyword: stringArg(),
                page: intArg({default: 1}),
            },
            resolve: async (_root, args, ctx) => {
                AuthService.authenticate(ctx);
                const pageSize: number = Config.defaultPageSize?.value || 10;
                return await prisma.question.findMany({
                    where: args.keyword ? {content: {contains: args.keyword}} : undefined,
                    take: pageSize,
                    skip: pageSize * ((args.page ?? 1) - 1),
                });
            }
        })
    }
})