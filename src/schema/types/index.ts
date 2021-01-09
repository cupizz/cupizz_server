import { arg, enumType, inputObjectType, objectType } from "@nexus/schema";
import { ConversationMember, Gender, MustHaveField, OnlineStatus, PrivateField, SocialProviderType, User, FileType, EducationLevel, UsualType, HaveKids, LookingFor, Religious, NotificationType } from "@prisma/client";
import { GraphQLUpload } from "apollo-server-express";
import { defaultAvatar } from "../../config";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService, MessageService, UserService } from "../../service";
import { calculateAge, calculateDistance, DistanceUnit } from "../../utils/helper";

export const Json = String;

export const Upload = GraphQLUpload;

export const GenderType = enumType({
    members: Object.keys(Gender),
    name: 'Gender'
});

export const FileTypeType = enumType({
    members: Object.keys(FileType),
    name: 'FileType'
})

export const DistanceUnitEnum = enumType({
    name: 'DistanceUnitEnum',
    members: Object.values(DistanceUnit)
})

export const SocialProviderEnumType = enumType({
    name: 'SocialProviderEnumType',
    members: Object.keys(SocialProviderType)
})

export const PrivateFieldEnumType = enumType({
    name: 'PrivateFieldEnum',
    members: Object.keys(PrivateField)
})

export const MustHaveEnumType = enumType({
    name: 'MustHaveEnum',
    members: Object.keys(MustHaveField)
})

export const educationLevelType = enumType({
    name: 'EducationLevelEnum',
    members: Object.keys(EducationLevel)
})

export const usualType = enumType({
    name: 'UsualTypeEnum',
    members: Object.keys(UsualType)
})

export const haveKidsType = enumType({
    name: 'HaveKidsEnum',
    members: Object.keys(HaveKids)
})

export const LookingForType = enumType({
    name: 'LookingForEnum',
    members: Object.keys(LookingFor)
})

export const ReligiousType = enumType({
    name: 'ReligiousEnum',
    members: Object.keys(Religious)
})

export enum FriendStatusEnum {
    none = 'none',
    sent = 'sent',
    received = 'received',
    friend = 'friend',
    me = 'me'
}

export const FriendStatusType = enumType({
    name: 'FriendStatusType',
    members: Object.keys(FriendStatusEnum)
})

export const OnlineStatusEnumType = enumType({
    name: 'OnlineStatus',
    members: Object.keys(OnlineStatus)
})

export const notificationType = enumType({
    name: 'NotificationType',
    members: Object.keys(NotificationType)
})

export const UserType = objectType({
    name: 'User',
    definition(t) {
        t.model.id()
        t.model.updatedAt()
        t.model.createdAt()
        t.model.deletedAt()
        t.field('data', {
            type: UserDataType,
            nullable: false,
            resolve: async (root, _args, ctx, _info): Promise<any> => {
                const friendType = await UserService.getFriendStatus(ctx.user?.id, root.id);
                return {
                    ...(await prisma.user.findOne({
                        where: { id: root.id },
                        include: {
                            userImages: {
                                orderBy: { sortOrder: 'asc' }
                            },
                        },
                    })),
                    friendType,
                };
            }
        })
    }
})

export const UserDataType = objectType({
    name: 'UserData',
    definition(t) {
        t.model('User').nickName()
        t.model('User').birthday()
        t.int('age', {
            nullable: true,
            resolve: (root, _args, _ctx, _info) => {
                const birthday = root.birthday;
                return calculateAge(birthday);
            }
        })
        t.model('User').introduction()
        t.model('User').gender()
        t.model('User').hobbies({ pagination: false, ordering: true })
        t.model('User').phoneNumber()
        t.model('User').job()
        t.model('User').height()
        t.model('User').address({
            resolve: (root: any) => UserService.getAddressOfUser(root)
        })
        t.model('User').educationLevel()
        t.model('User').smoking()
        t.model('User').drinking()
        t.model('User').yourKids()
        t.model('User').lookingFors()
        t.model('User').religious()
        t.model('User').minAgePrefer()
        t.model('User').maxAgePrefer()
        t.model('User').minHeightPrefer()
        t.model('User').maxHeightPrefer()
        t.model('User').mustHaveFields()
        t.model('User').genderPrefer()
        t.model('User').distancePrefer()
        t.model('User').distancePrefer()
        t.model('User').educationLevelsPrefer()
        t.model('User').theirKids()
        t.model('User').religiousPrefer()
        t.model('User').avatar({
            resolve: async (root: any, args, ctx, info, origin) => {
                const data = await origin(root, args, ctx, info);
                return data ?? defaultAvatar(ctx)
            }
        })
        t.model('User').cover()
        t.model('User').role()
        t.model('User').dislikeCount({
            resolve: (root, args, ctx, info, origin) => {
                if (ctx.user?.id === root.id || AuthService.authorize(ctx, { values: [Permission.user.list] }, false))
                    return origin(root, args, ctx, info);
                return null
            }
        })
        t.model('User').likeCount({
            resolve: (root, args, ctx, info, origin) => {
                if (ctx.user?.id === root.id || AuthService.authorize(ctx, { values: [Permission.user.list] }, false))
                    return origin(root, args, ctx, info);
                return null
            }
        })
        t.model('User').userImages({
            pagination: false, resolve: async (root: any, args, ctx) => {
                return root.userImages;
            }
        })
        t.model('User').socialProvider({ pagination: false, alias: 'socialProviders' })
        t.field('distance', {
            type: 'String',
            args: {
                unit: arg({ type: 'DistanceUnitEnum' })
            },
            resolve: (root: any, args, ctx) => {
                if (!ctx.user || !ctx.user.latitude || !ctx.user.longitude || !root.longitude || !root.latitude) {
                    return null;
                }
                return calculateDistance(ctx.user.latitude, ctx.user.longitude, root.latitude, root.longitude, args.unit) + ' ' + (args.unit ?? 'Km')
            }
        })
        t.field('friendType', {
            type: FriendType,
            nullable: false,
            resolve: (root: any, _args, _ctx, _info) => {
                return root.friendType;
            },
        })
        t.field('onlineStatus', {
            type: OnlineStatusEnumType,
            nullable: true,
            resolve: async (root: any, _args, ctx, _info) => {
                return ctx.user?.showActive && root.showActive
                    ? root.onlineStatus : null;
            }
        })
        t.model('User').lastOnline({
            resolve: (root: any, args, ctx, info, origin) => {
                return ctx.user.showActive && root.showActive
                    ? origin(root, args, ctx, info)
                    : null
            }
        })
        t.field('status', {
            type: 'UserStatus', nullable: true,
            resolve: (root: any, _args, ctx, _info) => {
                return UserService.canAccessPrivateAccount(ctx, root)
                    ? root.status : null;
            }
        })
        t.field('statusUpdatedAt', {
            type: 'DateTime', nullable: true,
            resolve: (root: any, _args, ctx, _info) => {
                return UserService.canAccessPrivateAccount(ctx, root)
                    ? root.statusUpdatedAt : null;
            }
        })
        t.field('settings', {
            type: UserSettingType,
            description: "Các cài đặt của User",
            nullable: true,
            resolve: (root: any, _args, ctx, _info): any => {
                if (ctx.user?.id === root.id || AuthService.authorize(ctx, { values: [Permission.user.list] }, false))
                    return { ...root }
                return null
            }
        })
    }
})

export const SocialProvider = objectType({
    name: 'SocialProvider',
    definition(t) {
        t.model.id()
        t.model.type()
        // t.model.email()
        // t.model.phoneNumber()
        // t.model.name()
        // t.model.avatar()
        // t.model.gender()
        // t.model.birthday()
    }
})

export const UserSettingType = objectType({
    name: 'UserSetting',
    definition(t) {
        t.model("User").allowMatching()
        t.model("User").isPrivate()
        t.model("User").showActive()
        t.model("User").pushNotiSetting()
    }
})

export const FriendType = objectType({
    name: 'FriendType',
    definition(t) {
        t.field('status', {
            type: FriendStatusType,
            nullable: false,
            description:
                `Trạng thái kết bạn:
- none: Người dưng
- sent: Bạn đã gửi lời mời kết bạn cho người này
- received: Bạn đã được người này yêu cầu kết bạn.
- friend: 2 người đã là bạn bè
- me: Đây chính là bạn.`,
        })
        t.field('data', {
            type: 'FriendDataType',
            nullable: true,
        })
    }
})

export const FriendDataType = objectType({
    name: 'FriendDataType',
    definition(t) {
        t.model('Friend').sender()
        t.model('Friend').receiver()
        t.model('Friend').sentAt()
        t.model('Friend').acceptedAt()
        t.model('Friend').updatedAt()
        t.model('Friend').isSuperLike()
        t.field('friend', {
            type: 'User',
            resolve: async (root: any, _args, ctx, _info) => {
                if (root.senderId === ctx.user.id) {
                    return await prisma.user.findOne({ where: { id: root.receiverId } });
                } else {
                    return await prisma.user.findOne({ where: { id: root.senderId } });
                }
            }
        })
    }
})

export const fileType = objectType({
    name: 'File',
    definition(t) {
        t.model.id()
        t.model.type()
        t.model.url()
        t.model.thumbnail({
            resolve: async (root: any, _args, _ctx, _info) => {
                return root.thumbnail || root.url;
            }
        })
    }
})

export const RoleType = objectType({
    name: 'Role',
    definition(t) {
        t.model.id()
        t.model.name()
        t.model.description()
        t.model.permissions()
        t.model.canAccessBackOffice()
    }
})

export const UserImageType = objectType({
    name: 'UserImage',
    definition(t) {
        t.model.id()
        t.model.image()
        t.model.user()
        t.model.userAnswer()
        t.model.sortOrder()
        t.model.createdAt()
    }
})

export const QuestionType = objectType({
    name: 'Question',
    definition(t) {
        t.model.id()
        t.model.content()
        t.model.color()
        t.model.textColor()
        t.model.gradient()
    }
})

export const UserAnswerType = objectType({
    name: 'UserAnswer',
    definition(t) {
        t.model.id()
        t.model.question()
        t.model.color()
        t.model.textColor()
        t.model.gradient()
        t.model.content()
        t.model.userImage()
        t.model.createBy()
        t.model.createAt()
    }
})

export const ConversationType = objectType({
    name: 'Conversation',
    definition(t) {
        t.model.id()
        t.model.members()
        t.field('data', {
            type: 'ConversationData',
            resolve: async (root, _args, _ctx, _info) => {
                return await prisma.conversation.findOne({
                    where: { id: root.id },
                    include: {
                        members: {
                            include: {
                                user: {
                                    include: {
                                        avatar: true,
                                    }
                                }
                            }
                        }
                    }
                });
            }
        })
        t.field('personalData', {
            type: 'PersonalConversationData',
            resolve: async (root, _args, ctx, _info) => {
                return await prisma.conversationMember.findOne({
                    where: {
                        conversationId_userId: {
                            conversationId: root.id,
                            userId: ctx.user.id
                        }
                    }
                });
            }
        })
        t.field('searchData', {
            type: objectType({
                name: 'SearchConversationData',
                definition(t) {
                    t.field('matchingMessage', {
                        type: 'Message',
                        nullable: false,
                    })
                }
            }),
            nullable: true
        })
    }
})

export const ConversationDataType = objectType({
    name: 'ConversationData',
    definition(t) {
        t.model("Conversation").name({
            resolve: async (root: any, args, ctx, info, origin) => {
                const data = await origin(root, args, ctx, info);
                return data || (root.members as (ConversationMember & { user: User })[])
                    .filter(e => e.userId !== ctx.user.id)
                    .map(e => e.user.nickName)
                    .join(', ') || 'Me';
            }
        })
        t.field('images', {
            type: 'File', list: true, nullable: false,
            resolve: async (root: any, _args, ctx, _info) => {
                const data = root.members
                    ?.filter((e: any) => e.user.avatar && (root.members?.length > 1 ? e.userId !== ctx.user.id : true))
                    ?.map((e: any) => e.user.avatar ?? defaultAvatar(ctx)) ?? [];
                return data;
            }
        })
        t.field('onlineStatus', {
            type: 'OnlineStatus', nullable: true,
            resolve: async (root: any, _args, ctx, _info) => {
                if(!ctx.user?.showActive) return null;
                const otherMembers = ((root.members ?? []) as (ConversationMember & { user: User })[])
                    .filter(e => e.userId !== ctx.user?.id);

                if (otherMembers.length === 0) {
                    return ctx.user?.onlineStatus ?? 'offline';
                } else if (otherMembers.length === 1) {
                    return otherMembers[0].user.onlineStatus;
                }

                const onlineMembers = otherMembers.findIndex((e) => e.user.onlineStatus == 'online' && e.user.showActive);
                if (onlineMembers >= 0) {
                    return 'online';
                } else {
                    const awayMembers = otherMembers.findIndex((e) => e.user.onlineStatus == 'away' && e.user.showActive);
                    if (awayMembers >= 0) {
                        return 'away';
                    }
                    return 'offline';
                }

            }
        })
        t.field('lastOnline', {
            type: 'DateTime', nullable: true,
            resolve: async (root: any, _args, ctx, _info) => {
                if(!ctx.user?.showActive) return null;
                const otherMembers = ((root.members ?? []) as (ConversationMember & { user: User })[])
                    .filter(e => e.userId !== ctx.user?.id);
                if ((otherMembers).length === 1 && otherMembers[0].user.showActive) {
                    return otherMembers[0].user.lastOnline;
                } else return null;
            }
        })
        t.field('newestMessage', {
            type: 'Message',
            resolve: async (root: any, _args, _ctx, _info) => {
                return MessageService.getNewestMessage(root.id);
            }
        })
        t.field('otherMembers', {
            type: 'ConversationMember',
            list: true,
            resolve: (root: any, _args, ctx, _info) => {
                return (root.members as ConversationMember[])
                    .filter(e => e.userId !== ctx.user?.id)
            }
        })
    }
})

export const PersonalConversationDataType = objectType({
    name: 'PersonalConversationData',
    definition(t) {
        t.model("ConversationMember").unreadMessageCount({
            resolve: async (root, args, ctx, info, origin) => {
                const data = await origin(root, args, ctx, info);
                return data || 0;
            }
        })
        t.model("ConversationMember").lastReadMessage()
    }
})

export const ConversationMemberType = objectType({
    name: 'ConversationMember',
    definition(t) {
        t.model.user()
        t.model.createdAt()
        t.model.lastReadMessage()
    }
})

export const MessageType = objectType({
    name: 'Message',
    definition(t) {
        t.model.id()
        t.model.conversation()
        t.model.message()
        t.model.createdAt()
        t.model.updatedAt()
        t.model.attachments({ pagination: false })
        t.model.sender()
    }
})

export const MessageAttachmentType = objectType({
    name: 'MessageAttachment',
    definition(t) {
        t.model.file()
        t.model.message()
    }
})

export const PostType = objectType({
    name: 'Post',
    definition(t) {
        t.model.id()
        t.model.category()
        t.model.comment()
    }
})

export const PostCategoryType = objectType({
    name: 'PostCategory',
    definition(t) {
        t.model.id()
        t.model.Post()
        t.model.value()
    }
})

export const CommentType = objectType({
    name: 'Comment',
    definition(t) {
        t.model.id()
        t.model.index()
        t.model.post()
        t.model.reply()
        t.model.parentComment()
        t.model.content()
        t.model.createdAt()
    }
})

export const QnAType = objectType({
    name: 'QnA',
    definition(t) {
        t.model.id()
        t.model.question()
        t.model.answer()
    }
})

export const TokenOutputType = objectType({
    name: 'TokenOutput',
    definition(t) {
        t.string('token', { nullable: false })
        t.string('description', { nullable: true })
    }
})

export const LoginOutputType = objectType({
    name: 'LoginOutput',
    definition(t) {
        t.string('token')
        t.field('info', {
            type: 'User',
            nullable: false
        })
    }
})

export const FileInputType = inputObjectType({
    name: 'FileInputType',
    definition(t) {
        t.field('type', { type: 'FileType', nullable: false })
        t.field('file', { type: 'Upload', nullable: false })
    }
})

export const AppConfigType = objectType({
    name: 'AppConfig',
    definition(t) {
        t.model.id()
        t.model.name()
        t.model.description()
        t.model.data()
    }
})

export const HobbyValuType = objectType({
    name: 'HobbyValue',
    definition(t) {
        t.model.id()
        t.model.value()
        t.model.isValid()
        t.model.index()
    }
})

