import { queryType, objectType, stringArg, arg, booleanArg } from '@nexus/schema';
import { Permission } from '../../model/permission';
import { AuthService } from '../../service';
import { Validator } from '../../utils/validator';
import request from 'request';
import { universities } from '../../utils/universities';
import { prisma } from '../../server';
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
                    appName: 'Cubizz',
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
            resolve: async (root, args, ctx, info) => {
                AuthService.authorize(ctx, { values: [Permission.user.list] });
                return await prisma.user.count({ where: args.where })
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
    }
})