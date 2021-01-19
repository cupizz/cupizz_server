import { inputObjectType, intArg, queryField } from "@nexus/schema";
import { arg, ObjectDefinitionBlock } from "@nexus/schema/dist/core";
import { Post, PostCategory } from "@prisma/client";
import { Config } from "../../config";
import { ErrorNotFound } from "../../model/error";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService } from "../../service";

export function postSimpleQuery(t: ObjectDefinitionBlock<'Query'>) {
    t.crud.post({
        resolve: async (root, args, ctx, info, origin: any) => {
            const data: Post = await origin(root, args, ctx, info);
            if (!data?.deletedAt) {
                throw ErrorNotFound();
            }
            return data;
        }
    })
    t.crud.postCategory()
    t.crud.postCategories()
    t.field('adminPostCount', {
        type: 'Int',
        description: 'Api for Admin',
        args: {
            where: arg({ type: 'PostWhereInput' }),
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authorize(ctx, { values: [Permission.post.list] })
            return await prisma.post.count({ where: { ...args.where, deletedAt: { equals: null } } })
        }
    })
}

export const postsQuery = queryField('posts', {
    type: 'Post',
    list: true,
    args: {
        page: intArg({ default: 1 }),
        where: inputObjectType({
            name: 'PostsClientWhereInput',
            definition(t) {
                t.field('categoryId', { type: 'StringFilter' })
                t.field('content', { type: 'StringFilter' })
                t.boolean('isMyPost', { default: false })
            }
        }),
        orderBy: inputObjectType({
            name: 'PostsClientOrderByInput',
            definition(t) {
                t.field('createdAt', { type: 'SortOrder' })
            }
        })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const pageSize: number = Config.defaultPageSize?.value || 10;

        return await prisma.post.findMany({
            take: pageSize,
            skip: pageSize * ((args.page ?? 1) - 1),
            orderBy: args.orderBy,
            where: {
                categoryId: args.where?.categoryId ?? undefined,
                content: args.where?.content ?? undefined,
                deletedAt: { equals: null },
                ...args?.where?.isMyPost ? { createdById: { equals: ctx.user.id } } : {}
            }
        });
    }
})