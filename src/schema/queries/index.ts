import { queryType, objectType } from '@nexus/schema';
import { Permission } from '../../model/permission';
import { AuthService } from '../../service';
import { Validator } from '../../utils/validator';
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
    }
})