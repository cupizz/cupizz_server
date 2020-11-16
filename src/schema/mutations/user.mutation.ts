import { arg, booleanArg, idArg, intArg, mutationField, stringArg } from "@nexus/schema";
import { FileCreateInput } from '@prisma/client';
import { ConstConfig } from "../../config";
import { ClientError, ErrorNotFound } from "../../model/error";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";
import { FileService } from "../../service/file.service";
import { RecommendService } from "../../service/recommend.service";
import { SocialNetworkService } from "../../service/socialNetwork.service";
import { Validator } from "../../utils/validator";

export const UpdateProfileMutation = mutationField('updateProfile', {
    type: 'User',
    args: {
        nickName: stringArg(),
        introduction: stringArg(),
        gender: arg({ type: 'Gender' }),
        hobbyIds: stringArg({ list: true }),
        phoneNumber: stringArg(),
        job: stringArg(),
        height: intArg(),
        privateFields: arg({ type: 'PrivateFieldEnum', list: true }),
        avatar: arg({ type: 'Upload' })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        Validator.phoneNumber(args.phoneNumber);

        let avatar: FileCreateInput;
        if (args.avatar) {
            avatar = await FileService.upload(await args.avatar);
        }

        const user = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                ...args.nickName ? { nickName: { set: args.nickName } } : {},
                ...args.introduction ? { introduction: { set: args.introduction } } : {},
                ...args.gender ? { gender: { set: args.gender } } : {},
                ...args.phoneNumber ? { phoneNumber: { set: args.phoneNumber } } : {},
                ...args.job ? { job: { set: args.job } } : {},
                ...args.height ? { height: { set: args.height } } : {},
                ...args.privateFields ? { privateFields: { set: args.privateFields } } : {},
                ...args.hobbyIds ? { hobbies: { set: args.hobbyIds?.map(e => ({ id: e })) } } : {},
                ...avatar ? { avatar: { create: avatar } } : {}
            }
        })

        if (args.hobbyIds) {
            await RecommendService.regenerateRecommendableUsers(ctx.user.id);
        }
        return user;
    }
})

export const UpdateMySettingMutation = mutationField('updateMySetting', {
    type: 'User',
    args: {
        minAgePrefer: intArg(),
        maxAgePrefer: intArg(),
        minHeightPrefer: intArg(),
        maxHeightPrefer: intArg(),
        genderPrefer: arg({ type: 'Gender', list: true }),
        distancePrefer: intArg(),
        mustHaveFields: arg({ type: 'MustHaveEnum', list: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        const user = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                ...args,
                genderPrefer: args.genderPrefer ? { set: args.genderPrefer } : undefined,
                mustHaveFields: args.mustHaveFields ? { set: args.mustHaveFields } : undefined
            }
        })
        await RecommendService.regenerateRecommendableUsers(ctx.user.id);
        return user;
    }
})

export const ConnectSocialNetworkMutation = mutationField('connectSocialNetwork', {
    type: 'User',
    args: {
        type: arg({ type: 'SocialProviderEnumType', nullable: false }),
        accessToken: stringArg({ nullable: false }),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);
        const socialData = await SocialNetworkService.login(args.type, args.accessToken);

        const currentSocial = await prisma.socialProvider.findOne({ where: { id_type: socialData } });
        if (currentSocial) {
            if (currentSocial.userId === ctx.user.id) {
                return ctx.user;
            } else {
                throw ClientError("Tài khoản mạng xã hội này đã được kết nối với một tài khoản khác.");
            }
        }

        const user = (await prisma.socialProvider.create({
            data: {
                ...socialData,
                user: { connect: { id: ctx.user.id } }
            },
            include: { user: true }
        })).user;

        return user;
    }
})

export const AddUserImageMutation = mutationField('addUserImage', {
    type: 'UserImage',
    args: {
        image: arg({ type: 'Upload', nullable: false }),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        const userImage = await prisma.userImage.create({
            data: {
                image: { create: await FileService.upload(await args.image) },
                user: { connect: { id: ctx.user.id } }
            }
        })
        return userImage;
    }
})

export const RemoveUserImageMutation = mutationField('removeUserImage', {
    type: 'UserImage',
    args: {
        id: stringArg({ nullable: false })
    },
    resolve: async (root, args, ctx, info) => {
        AuthService.authenticate(ctx);
        const where = {
            userId_imageId: {
                imageId: args.id,
                userId: ctx.user.id
            }
        };

        if (!await prisma.userImage.findOne({ where })) {
            throw ErrorNotFound();
        }

        return await prisma.userImage.delete({ where })
    }
})

export const AnswerQuestionMutation = mutationField('answerQuestion', {
    type: 'UserAnswer',
    args: {
        questionId: idArg({ nullable: false }),
        color: stringArg({ nullable: false }),
        content: stringArg({ nullable: false }),
        backgroundImage: arg({ type: 'Upload' })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        if (!await prisma.question.findOne({ where: { id: args.questionId } })) {
            throw ErrorNotFound('Question not found');
        }

        return await prisma.userAnswer.create({
            data: {
                color: args.color,
                content: args.content,
                createBy: { connect: { id: ctx.user.id } },
                question: { connect: { id: args.questionId } },
                ...args.backgroundImage ? {
                    userImage: {
                        create: {
                            image: { create: await FileService.upload(await args.backgroundImage) },
                            user: { connect: { id: ctx.user.id } }
                        }
                    }
                } : {}
            }
        })
    }
})

export const AddFriendMutation = mutationField('addFriend', {
    type: 'FriendType',
    args: {
        userId: idArg({ nullable: false, description: 'Id của user muốn kết bạn' }),
        isSuperLike: booleanArg({ nullable: true })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authorize(ctx, { values: [Permission.friend.create] });
        return await UserService.addFriend(ctx.user.id, args.userId, args.isSuperLike)
    }
})

export const RemoveFriendMutation = mutationField('removeFriend', {
    type: 'Boolean',
    args: {
        userId: idArg({ nullable: false, description: 'Id của user muốn remove' })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authorize(ctx, { values: [Permission.friend.create] });
        await UserService.removeFriend(ctx, args.userId);
        return true;
    }
})

export const UndoLastDislikedUserMutation = mutationField('undoLastDislikedUser', {
    type: 'User',
    resolve: async (_root, _args, ctx, _info) => {
        return await RecommendService.undoDislike(ctx);
    }
})