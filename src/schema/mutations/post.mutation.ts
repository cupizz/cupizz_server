import { intArg, mutationField, stringArg } from "@nexus/schema";
import { arg, booleanArg, ObjectDefinitionBlock } from "@nexus/schema/dist/core";
import { ForbiddenError } from "apollo-server-express";
import assert from "assert";
import Strings from "../../constants/strings";
import { ClientError, ErrorNotFound } from "../../model/error";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService, FileService } from "../../service";

export const simplePostMutation = (t: ObjectDefinitionBlock<'Mutation'>) => {
    t.field('likePost', {
        type: 'Post',
        args: {
            postId: intArg({ required: true }),
            type: arg({ type: 'LikeType' })
        },
        async resolve(_root, args, ctx) {
            AuthService.authenticate(ctx);
            const post = await prisma.post.findOne({
                where: { id: args.postId },
            })
            if (!post) throw ErrorNotFound()
            const data = await prisma.userLikedPost.upsert({
                where: { userId_postId: { postId: post.id, userId: ctx.user.id } },
                create: {
                    post: { connect: { id: post.id } },
                    user: { connect: { id: ctx.user.id } },
                    createdAt: new Date(),
                    type: args.type,
                },
                update: { type: args.type, createdAt: new Date() },
                include: { post: true }
            })
            return data.post;
        }
    })
    t.field('unlikePost', {
        type: 'Post',
        args: {
            postId: intArg({ required: true }),
        },
        async resolve(_root, args, ctx) {
            AuthService.authenticate(ctx);
            const likeData = await prisma.userLikedPost.findOne({
                where: { userId_postId: { postId: args.postId, userId: ctx.user.id } },
                include: { post: true },
            })
            if (!likeData) return likeData.post;
            const data = await prisma.userLikedPost.delete({
                where: { userId_postId: { postId: args.postId, userId: ctx.user.id } },
                include: { post: true },
            })
            return data.post;
        }
    })
}

export const CreatePostCategoryMutation = mutationField(
    'createPostCategory',
    {
        type: 'PostCategory',
        args: {
            value: stringArg({ nullable: false }),
            color: stringArg({ default: 'ffffff' })
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authorize(ctx, { values: [Permission.postCategory.create] });

            const cat = await prisma.postCategory.create({
                data: {
                    value: args.value,
                    color: args.color,
                }
            })

            return cat;
        }
    }
)

export const UpdatePostCategoryMutation = mutationField(
    'updatePostCategory',
    {
        type: 'PostCategory',
        args: {
            id: stringArg({ nullable: false }),
            value: stringArg(),
            color: stringArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authorize(ctx, { values: [Permission.postCategory.update] });

            const cat = await prisma.postCategory.update({
                where: { id: args.id },
                data: {
                    value: args.value,
                    color: args.color,
                }
            })

            return cat;
        }
    }
)

// export const DeletePostCategoryMutation = mutationField(
//     'deletePostCategory',
//     {
//         type: 'PostCategory',
//         args: {
//             id: intArg({ nullable: false })
//         },
//         resolve: async (_root, args, ctx, _info) => {
//             AuthService.authorize(ctx, { values: [Permission.postCategory.delete] });

//             const cat = await prisma.postCategory.update({ where: { id: args.id }, data: { deletedAt: new Date() } })

//             return cat;
//         }
//     }
// )

export const CreatePostMutation = mutationField(
    'createPost',
    {
        type: 'Post',
        args: {
            categoryId: stringArg({ nullable: false }),
            content: stringArg({ nullable: false }),
            images: arg({ type: 'Upload', list: true, default: [] })
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authenticate(ctx);
            assert(args.content !== "", Strings.error.contentMustBeNotEmpty)
            assert(!args.images || args.images.length <= 4, 'Chỉ được đăng tối đa 4 hình.')

            const imageFiles = await Promise.all(args.images ?? [])

            const post = await prisma.post.create({
                data: {
                    category: { connect: { id: args.categoryId } },
                    content: args.content,
                    createdBy: { connect: { id: ctx.user.id } },
                    images: { create: await FileService.uploadMulti(imageFiles) }
                }
            })

            return post;
        }
    }
)

export const UpdatePostMutation = mutationField(
    'updatePost',
    {
        type: 'Post',
        description: '[ADMIN or OWNER]',
        args: {
            id: intArg({ nullable: false }),
            categoryId: stringArg(),
            content: stringArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authenticate(ctx);
            assert(args.content !== "", Strings.error.contentMustBeNotEmpty)

            const post = await prisma.post.findOne({ where: { id: args.id } });
            if (!post) {
                throw ErrorNotFound('Post not found');
            } else if (post.createdById !== ctx.user.id && !AuthService.authorize(ctx, { values: [Permission.post.update] }, false)) {
                throw new ForbiddenError(Strings.error.unAuthenticate);
            } else if (args.categoryId && !(await prisma.postCategory.findOne({ where: { id: args.categoryId } }))) {
                throw ErrorNotFound('Category not found');
            }

            return await prisma.post.update({
                where: { id: args.id },
                data: {
                    ...args.categoryId ? { category: { connect: { id: args.categoryId } } } : {},
                    content: args.content,
                }
            })
        }
    }
)

export const DeletePostMutation = mutationField(
    'deletePost',
    {
        type: 'Post',
        description: '[ADMIN or OWNER]',
        args: {
            id: intArg({ nullable: false })
        },
        resolve: async (_root, args, ctx, _info) => {
            if ((await prisma.post.findOne({ where: { id: args.id } })).createdById !== ctx.user?.id) {
                if (!AuthService.authorize(ctx, { values: [Permission.post.delete] }, false)) {
                    throw ClientError(Strings.error.cannotDeletePostOfOtherUser);
                }
            }
            if (!await prisma.post.findOne({ where: { id: args.id } })) {
                throw ErrorNotFound();
            }

            const post = await prisma.post.update({
                where: { id: args.id },
                data: { deletedAt: new Date() }
            })

            return post;
        }
    }
)

export const CommentPostMutation = mutationField(
    'commentPost',
    {
        type: 'Comment',
        args: {
            postId: intArg({ nullable: false }),
            content: stringArg({ nullable: false }),
            isIncognito: booleanArg({ default: true }),
            parentCommentIndex: intArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            AuthService.authenticate(ctx);

            assert(args.content !== "", Strings.error.contentMustBeNotEmpty);
            const commentCount = (await prisma.comment.findFirst({ where: { postId: { equals: args.postId } }, orderBy: { index: 'desc' } }))?.index ?? 0;

            let parentComment;
            if (args.parentCommentIndex) {
                parentComment = await prisma.comment.findFirst({ where: { index: args.parentCommentIndex, postId: args.postId } });

                if (!parentComment) throw ErrorNotFound("Parent comment is not found.")
            }

            const comment = await prisma.comment.create({
                data: {
                    content: args.content,
                    index: commentCount + 1,
                    post: { connect: { id: args.postId } },
                    ...parentComment ? { parentComment: { connect: { id: parentComment.id } } } : {},
                    createdBy: { connect: { id: ctx.user.id } },
                    isIncognito: args.isIncognito,
                }
            })

            return comment;
        }
    }
)

export const updateCommentMutation = mutationField(
    'updateComment',
    {
        type: 'Comment',
        args: {
            id: stringArg({ nullable: false }),
            content: stringArg(),
            parentCommentIndex: intArg(),
        },
        resolve: async (_root, args, ctx, _info) => {
            assert(args.content !== "", Strings.error.contentMustBeNotEmpty)

            let comment = await prisma.comment.findOne({ where: { id: args.id } });

            let parentComment;
            if (args.parentCommentIndex) {
                parentComment = await prisma.comment.findFirst({ where: { index: args.parentCommentIndex, postId: comment.postId } });

                if (!parentComment) throw ErrorNotFound("Parent comment is not found.")
            }

            if (!comment) {
                throw ErrorNotFound();
            } else if (comment.createdById !== ctx?.user?.id && !AuthService.authorize(ctx, { values: [Permission.comment.update] }, false)) {
                throw new ForbiddenError(Strings.error.unAuthenticate);
            }

            comment = await prisma.comment.update({
                where: { id: args.id },
                data: {
                    content: args.content,
                    ...parentComment ? { parentComment: { connect: { id: parentComment.id } } } : {}
                }
            })

            return comment;
        }
    }
)

export const deleteCommentMutation = mutationField(
    'deleteComment',
    {
        type: 'Comment',
        args: {
            id: stringArg({ nullable: false }),
        },
        resolve: async (_root, args, ctx, _info) => {
            let comment = await prisma.comment.findOne({ where: { id: args.id } });

            if (!comment) {
                throw ErrorNotFound();
            } else if (comment.createdById !== ctx?.user?.id && !AuthService.authorize(ctx, { values: [Permission.comment.delete] }, false)) {
                throw new ForbiddenError(Strings.error.unAuthenticate);
            }

            comment = await prisma.comment.delete({
                where: { id: args.id },
            })

            return comment;
        }
    }
)