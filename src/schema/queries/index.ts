import { queryType, objectType } from '@nexus/schema';
export * from './user.query';

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
    }
})