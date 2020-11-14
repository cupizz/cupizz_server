import { arg, enumType, inputObjectType, objectType } from "@nexus/schema";
import { ConversationMember, User } from "@prisma/client";
import { GraphQLUpload } from "apollo-server-express";
import { Config, ConstConfig } from "../../config";
import { prisma } from "../../server";
import { UserService } from "../../service";
import { calculateDistance, DistanceUnit } from "../../utils/helper";
import { Validator } from "../../utils/validator";

export const Json = String;

export const Upload = GraphQLUpload;

export const GenderType = enumType({
    members: ['male', 'female', 'other'],
    name: 'Gender'
});

export const FileTypeType = enumType({
    members: ['image', 'sound'],
    name: 'FileType'
})

export const DistanceUnitEnum = enumType({
    name: 'DistanceUnitEnum',
    members: Object.values(DistanceUnit)
})

export const SocialProviderEnumType = enumType({
    name: 'SocialProviderEnumType',
    members: ['email', 'facebook', 'google', 'instagram']
})

export const PrivateFieldEnumType = enumType({
    name: 'PrivateFieldEnum',
    members: [
        'birthday',
        'introduction',
        'gender',
        'hobbies',
        'phoneNumber',
        'job',
        'height',
    ]
})

export const MustHaveEnumType = enumType({
    name: 'MustHaveEnum',
    members: [
        'age',
        'height',
        'distance',
        'gender',
    ]
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
    members: ['online', 'away', 'offline']
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
                    ...root,
                    friendType,
                }
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
                if (birthday) {
                    const ageDifMs = Date.now() - birthday.getTime();
                    const ageDate = new Date(ageDifMs);
                    return Math.abs(ageDate.getUTCFullYear() - 1970);
                } else {
                    return null;
                }
            }
        })
        t.model('User').introduction()
        t.model('User').gender()
        t.model('User').hobbies({ pagination: false, ordering: true })
        t.model('User').phoneNumber()
        t.model('User').job()
        t.model('User').height()
        t.model('User').minAgePrefer()
        t.model('User').maxAgePrefer()
        t.model('User').minHeightPrefer()
        t.model('User').maxHeightPrefer()
        t.model('User').mustHaveFields()
        t.model('User').genderPrefer()
        t.model('User').distancePrefer()
        t.model('User').distancePrefer()
        t.model('User').avatar()
        t.model('User').cover()
        t.model('User').role()
        t.model('User').userImages({ pagination: false })
        t.model('User').socialProvider({ pagination: false })
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
            resolve: async (root: any, _args, _ctx, _info) => {
                if (!Validator.isFriend(root.friendType?.status) || !root.showActive)
                    return null;
                return root.onlineStatus;
            }
        })
        t.model('User').lastOnline({
            resolve: (root: any, args, ctx, info, origin) => {
                return Validator.isFriend(root.friendType.status)
                    ? origin(root, args, ctx, info)
                    : null
            }
        })
        t.field('settings', {
            type: UserSettingType,
            description: "Các cài đặt của User",
            nullable: true,
            resolve: (root: any, _args, ctx, _info): any => {
                if (ctx.user?.id === root.id) return { ...root }
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
        t.model('Friend').isSuperLike()
    }
})

export const FileType = objectType({
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
    }
})

export const UserImageType = objectType({
    name: 'UserImage',
    definition(t) {
        t.model.image()
        t.model.user()
        t.model.userAnswer()
    }
})

export const QuestionType = objectType({
    name: 'Question',
    definition(t) {
        t.model.id()
        t.model.content()
        t.model.color()
    }
})

export const UserAnswerType = objectType({
    name: 'UserAnswer',
    definition(t) {
        t.model.id()
        t.model.question()
        t.model.color()
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
                    include: { members: { include: { user: true } } }
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
        t.model.messages({ pagination: true, ordering: true })
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
        t.field('newestMessage', {
            type: 'Message',
            nullable: true,
            resolve: async (root: any, _args, _ctx, _info) => {
                return await prisma.message.findFirst({
                    where: { conversationId: root.id },
                    orderBy: { createdAt: 'desc' }
                })
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
    }
})

