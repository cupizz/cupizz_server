import { arg, booleanArg, intArg, objectType, queryType, stringArg } from '@nexus/schema';
import { Config } from '../../config';
import { Permission } from '../../model/permission';
import { prisma } from '../../server';
import { AuthService, UserService } from '../../service';
import { universities } from '../../utils/universities';
import { Validator } from '../../utils/validator';
import { postSimpleQuery } from './post.query';
export * from './message.query';
export * from './user.query';
export * from './post.query';


export const PublicQueries = queryType({
    definition(t) {
        postSimpleQuery(t);
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
            //@ts-ignore
            description: '[ADMIN]',
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
        t.crud.questions({
            alias: 'adminQuestions',
            filtering: true,
            ordering: true,
            pagination: true,
            resolve: (root, args, ctx, info, origin) => {
                AuthService.authorize(ctx, { values: [Permission.question.list] });
                return origin(root, args, ctx, info);
            }
        })
        t.field('questions', {
            type: objectType({
                name: 'QuestionsOutput',
                definition(t) {
                    t.field('data', { type: 'Question', list: true })
                    t.field('isLastPage', { type: 'Boolean' })
                }
            }),
            args: {
                keyword: stringArg(),
                page: intArg({ default: 1 }),
            },
            resolve: async (_root, args, ctx) => {
                AuthService.authenticate(ctx);
                const pageSize: number = Config.defaultPageSize?.value || 10;
                const data = await prisma.question.findMany({
                    where: args.keyword ? { content: { contains: args.keyword } } : undefined,
                    take: pageSize,
                    skip: pageSize * ((args.page ?? 1) - 1),
                });
                return { data, isLastPage: data.length < pageSize };
            }
        })
        t.field('unreadMessageCount', {
            type: 'Int',
            resolve: async (_root, _args, ctx) => {
                AuthService.authenticate(ctx);
                return (await prisma.conversationMember.aggregate({
                    where: { userId: ctx.user.id },
                    sum: { unreadMessageCount: true }
                })).sum?.unreadMessageCount ?? 0;
            }
        })
        t.field('unreadReceiveFriendCount', {
            type: 'Int',
            args: {
                justSuperLike: booleanArg({ default: true })
            },
            resolve: async (_root, args, ctx) => {
                AuthService.authenticate(ctx);
                return await prisma.friend.count({
                    where: {
                        receiverId: { equals: ctx.user.id },
                        acceptedAt: { equals: null },
                        isSuperLike: { equals: args.justSuperLike || undefined },
                        readSent: { equals: false }
                    }
                });
            }
        })
        t.field('unreadAcceptedFriendCount', {
            type: 'Int',
            resolve: async (_root, _args, ctx) => {
                AuthService.authenticate(ctx);
                return await prisma.friend.count({
                    where: {
                        senderId: { equals: ctx.user.id },
                        acceptedAt: { not: { equals: null } },
                        readAccepted: { equals: false }
                    }
                });
            }
        })
        t.crud.qnAs({
            pagination: false,
            filtering: true,
            ordering: true,
        })
        t.field('colorsOfAnswer', {
            type: objectType({
                name: 'ColorOfAnswer',
                definition(t) {
                    t.field('color', { type: 'String' });
                    t.field('gradient', { type: 'String', list: true, nullable: true });
                    t.field('textColor', { type: 'String' });
                }
            }),
            list: true,
            resolve: () => {
                return [
                    {
                        color: '000000',
                        textColor: 'ffffff'
                    },
                    {
                        color: 'ffffff',
                        textColor: '000000'
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            '77a1d3',
                            '79cbca',
                            'e684ae',
                        ]
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            'EC6F66',
                            'F3A183',
                        ]
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            'ED4264',
                            'FFEDBC',
                        ]
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            'DC2424',
                            '4A569D',
                        ]
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            '24C6DC',
                            '514A9D',
                        ]
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            '0099F7',
                            'F11712',
                        ]
                    },
                    {
                        textColor: 'ffffff',
                        gradient: [
                            '#833ab4',
                            '#fd1d1d',
                            '#fcb045',
                        ]
                    }
                ]
            }
        })
    }
})