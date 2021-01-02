import { arg, booleanArg, floatArg, idArg, intArg, mutationField, stringArg } from "nexus";
import { inputObjectType, NexusInputFieldConfig } from "nexus/dist/core";
import { Prisma } from '@prisma/client';
import Strings from "../../constants/strings";
import { ClientError, ErrorIncorrectPassword, ErrorNotFound } from "../../model/error";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";
import { FileService } from "../../service/file.service";
import { RecommendService } from "../../service/recommend.service";
import { SocialNetworkService } from "../../service/socialNetwork.service";
import { PasswordHandler } from "../../utils/passwordHandler";
import { Validator } from "../../utils/validator";
import { logger } from "../../utils/logger";

export const changePasswordMutation = mutationField('changePassword', {
    type: 'Boolean',
    args: {
        oldPass: stringArg({ required: true }),
        newPass: stringArg({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
        AuthService.authenticate(ctx);

        if (!PasswordHandler.compare(args.oldPass, ctx.user.password)) {
            throw ErrorIncorrectPassword;
        }
        Validator.password(args.newPass);

        await prisma.user.update({
            where: { id: ctx.user.id },
            data: { password: PasswordHandler.encode(args.newPass) }
        })

        return true;
    }
})

export const UpdateProfileMutation = mutationField('updateProfile', {
    type: 'User',
    args: {
        nickName: stringArg(),
        introduction: stringArg(),
        gender: arg({ type: 'Gender' }),
        birthday: arg({ type: 'DateTime' }),
        latitude: floatArg(),
        longitude: floatArg(),
        hobbyIds: stringArg({ list: true }),
        phoneNumber: stringArg(),
        job: stringArg(),
        height: intArg(),
        privateFields: arg({ type: 'PrivateFieldEnum', list: true }),
        avatar: arg({ type: 'Upload' }),
        cover: arg({ type: 'Upload' }),
        address: stringArg(),
        educationLevel: arg({ type: 'EducationLevel' }),
        smoking: arg({ type: 'UsualType' }),
        drinking: arg({ type: 'UsualType' }),
        yourKids: arg({ type: 'HaveKids' }),
        lookingFors: arg({ type: 'LookingFor', list: true }),
        religious: arg({ type: 'Religious' }),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        if (args.phoneNumber) {
            Validator.phoneNumber(args.phoneNumber);
        }

        let avatar: Prisma.FileCreateInput;
        if (args.avatar) {
            avatar = await FileService.upload(await args.avatar);
        }

        let cover: Prisma.FileCreateInput;
        if (args.cover) {
            cover = await FileService.upload(await args.cover);
        }

        const user = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                ...(args.nickName ? { nickName: { set: args.nickName } } : {}),
                ...(args.introduction ? { introduction: { set: args.introduction } } : {}),
                ...(args.gender ? { gender: { set: args.gender } } : {}),
                ...(args.phoneNumber ? { phoneNumber: { set: args.phoneNumber } } : {}),
                ...(args.birthday ? { birthday: { set: args.birthday } } : {}),
                ...(args.latitude ? { latitude: { set: args.latitude } } : {}),
                ...(args.longitude ? { longitude: { set: args.longitude } } : {}),
                ...(args.longitude || args.latitude ? { address: { set: '' } } : {}),
                ...(args.job ? { job: { set: args.job } } : {}),
                ...(args.address ? { address: { set: args.address } } : {}),
                ...(args.educationLevel !== undefined ? { educationLevel: { set: args.educationLevel } } : {}),
                ...(args.smoking !== undefined ? { smoking: { set: args.smoking } } : {}),
                ...(args.drinking !== undefined ? { drinking: { set: args.drinking } } : {}),
                ...(args.yourKids !== undefined ? { yourKids: { set: args.yourKids } } : {}),
                ...(args.lookingFors !== undefined ? { lookingFors: { set: args.lookingFors } } : {}),
                ...(args.religious !== undefined ? { religious: { set: args.religious } } : {}),
                ...(args.height ? { height: { set: args.height } } : {}),
                ...(args.privateFields ? { privateFields: { set: args.privateFields } } : {}),
                ...(args.hobbyIds ? { hobbies: { set: args.hobbyIds?.map(e => ({ id: e })) } } : {}),
                ...(avatar ? { avatar: { create: avatar } } : {}),
                ...(cover ? { cover: { create: cover } } : {})
            }
        })

        if (args.hobbyIds || args.latitude || args.longitude) {
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
        mustHaveFields: arg({ type: 'MustHaveEnum', list: true }),
        educationLevelsPrefer: arg({ type: 'EducationLevel', list: true }),
        theirKids: arg({ type: 'HaveKids' }),
        religiousPrefer: arg({ type: 'Religious', list: true }),
        allowMatching: booleanArg(),
        isPrivate: booleanArg(),
        showActive: booleanArg(),
        pushNotiSetting: arg({ type: 'NotificationType', list: true }),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        const user = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                ...args,
                genderPrefer: args.genderPrefer ? { set: args.genderPrefer } : undefined,
                mustHaveFields: args.mustHaveFields ? { set: args.mustHaveFields } : undefined,
                educationLevelsPrefer: args.educationLevelsPrefer ? { set: args.educationLevelsPrefer } : undefined,
                theirKids: args.theirKids ? { set: args.theirKids } : undefined,
                religiousPrefer: args.religiousPrefer ? { set: args.religiousPrefer } : undefined,
                allowMatching: args.allowMatching,
                isPrivate: args.isPrivate,
                showActive: args.showActive,
                pushNotiSetting: args.pushNotiSetting,
            }
        })
        await RecommendService.regenerateRecommendableUsers(ctx.user.id);
        return user;
    }
})

export const updateUserImagesSortOrder = mutationField('updateUserImagesSortOrder', {
    type: 'User',
    args: {
        userImagesSortOrder: stringArg({ list: true, description: 'Danh sách image id theo thứ tự' }),
    },
    resolve: async (_root, args, ctx) => {
        AuthService.authenticate(ctx);

        const currentUserImages = (await prisma.userImage.findMany({ where: { userId: { equals: ctx.user.id } } }));

        // Sửa lại ds userImagesSortOrder sao cho chứa đầy đủ các image hiện tại.
        const standardizedUserImagesSortOrder: string[] = [];
        if (args.userImagesSortOrder) {
            standardizedUserImagesSortOrder.push(...Array.from(new Set(args.userImagesSortOrder)).filter(e => currentUserImages.findIndex(e2 => e2.id === e) >= 0));
            standardizedUserImagesSortOrder.push(...currentUserImages.filter(e => !args.userImagesSortOrder.includes(e.id)).map(e => e.id));
        }

        return await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                userImages: {
                    update: standardizedUserImagesSortOrder.map((e, i) => ({
                        where: { id: e },
                        data: { sortOrder: i + 1 }
                    }))
                }
            }
        })
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

        const currentSocial = await prisma.socialProvider.findUnique({ where: { id_type: socialData } });
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

        const imageCount = (await prisma.userImage.findFirst({
            where: { userId: ctx.user.id },
            orderBy: { sortOrder: 'desc' }
        }))?.sortOrder ?? 0;

        const userImage = await prisma.userImage.create({
            data: {
                image: { create: await FileService.upload(await args.image) },
                user: { connect: { id: ctx.user.id } },
                sortOrder: imageCount + 1,
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
    resolve: async (_root, args, ctx) => {
        AuthService.authenticate(ctx);

        if (!(await prisma.userImage.findUnique({ where: { id: args.id } }))) {
            throw ErrorNotFound();
        }

        return await prisma.userImage.delete({ where: { id: args.id } })
    }
})

export const AnswerQuestionMutation = mutationField('answerQuestion', {
    type: 'UserImage',
    args: {
        questionId: idArg({ nullable: false }),
        color: stringArg(),
        textColor: stringArg(),
        gradient: stringArg({ list: true }),
        content: stringArg({ nullable: false }),
        backgroundImage: arg({ type: 'Upload' })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        if (!(await prisma.question.findUnique({ where: { id: args.questionId } }))) {
            throw ErrorNotFound('Question not found');
        }

        const imageCount = (await prisma.userImage.findFirst({
            where: { userId: ctx.user.id },
            orderBy: { sortOrder: 'desc' }
        }))?.sortOrder ?? 0;

        return await prisma.userImage.create({
            data: {
                user: { connect: { id: ctx.user.id } },
                ...(args.backgroundImage ? { image: { create: await FileService.upload(await args.backgroundImage) } } : {}),
                sortOrder: imageCount + 1,
                userAnswer: {
                    create: {
                        color: args.color,
                        content: args.content,
                        textColor: args.textColor,
                        gradient: args.gradient ?? [],
                        createBy: { connect: { id: ctx.user.id } },
                        question: { connect: { id: args.questionId } },
                    },
                }
            }
        });
    }
})

export const editAnswerMutation = mutationField('editAnswer', {
    type: 'UserImage',
    args: {
        answerId: idArg({ required: true }),
        color: stringArg(),
        textColor: stringArg(),
        gradient: stringArg({ list: true }),
        content: stringArg(),
        backgroundImage: arg({ type: 'Upload' })
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authenticate(ctx);

        const userAnswer = await prisma.userAnswer.findUnique({
            where: { id: args.answerId },
            include: { userImage: true }
        });

        if (!userAnswer || !userAnswer.userImage) {
            throw ErrorNotFound('Không tìm thấy dữ liệu. Vui lòng tải lại trang và thử lại.');
        }

        let image;
        if (args.backgroundImage) {
            image = await FileService.upload(await args.backgroundImage);
        }

        return (await prisma.userAnswer.update({
            where: { id: args.answerId },
            data: {
                ...(args.color ? { color: { set: args.color } } : {}),
                ...(args.textColor ? { textColor: { set: args.textColor } } : {}),
                ...(args.gradient ? { gradient: { set: args.gradient } } : {}),
                ...(args.content ? { content: { set: args.content } } : {}),
                ...(image ? {
                    userImage: {
                        update: {
                            image: {
                                ...(userAnswer.userImage?.imageId ? {
                                    update: { ...image, id: userAnswer.userImage.imageId },
                                } : { create: image })
                            }
                        }
                    }
                } : {}),
            },
            include: { userImage: true }
        })).userImage;
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

export const updateUserStatusMutation = mutationField('updateUserStatus', {
    type: 'User',
    description: '[ADMIN]',
    args: {
        id: idArg({ required: true }),
        status: arg({ type: 'UserStatus', required: true }),
    },
    resolve: async (_root, args, ctx, _info) => {
        AuthService.authorize(ctx, { values: [Permission.user.update] });
        try {
            return await prisma.user.update({
                where: { id: args.id },
                data: { status: args.status }
            });
        } catch (e) {
            if (!(await prisma.user.findUnique({ where: { id: args.id } }))) {
                throw ErrorNotFound(Strings.error.userNotFound);
            }
            throw e;
        }
    }
})