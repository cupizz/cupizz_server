import { enumType, inputObjectType, objectType } from "@nexus/schema";
import { GraphQLUpload } from "apollo-server";
import { UserService } from "../../service";

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

export const SocialProviderEnumType = enumType({
    name: 'SocialProviderEnumType',
    members: ['email', 'facebook', 'google', 'apple']
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

export const UserType = objectType({
    name: 'User',
    definition(t) {
        t.model.id()
        t.model.nickName()
        t.model.birthday()
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
        t.model.genderBorn()
        t.model.gender()
        t.model.bodies()
        t.model.personalities()
        t.model.hobbies()
        t.model.introduction()
        t.model.agesOtherPerson()
        t.model.genderBornOtherPerson()
        t.model.genderOtherPerson()
        t.model.bodiesOtherPerson()
        t.model.personalitiesOtherPerson()
        t.model.hasFreeTime()
        t.model.phoneNumber()
        t.model.job()
        t.model.degree()
        t.model.area()
        t.model.city()
        t.model.schedule()
        t.model.updatedAt()
        t.model.createdAt()
        t.model.deletedAt()
        t.model.identifyImage()
        t.model.avatar()
        t.model.role()
        t.model.userImage({ pagination: false })
        t.model.userAreaOtherPerson({ pagination: false })
        t.model.userCityOtherPerson({ pagination: false })
        t.model.userPurposeUseApp({ pagination: false })
        t.model.socialProvider({ pagination: false })
        t.field('settings', {
            type: UserSettingType,
            description: "Các cài đặt của User",
            nullable: true,
            resolve: (root, _args, ctx, _info): any => {
                if (ctx.user?.id === root.id) return { ...root }
                return null
            }
        })
        t.field('friendType', {
            type: FriendType,
            nullable: false,
            resolve: async (root, _args, ctx, _info) => {
                return await UserService.getFriendStatus(ctx.user?.id, root.id);
            },
        })
    }
})

export const SocialProvider = objectType({
    name: 'SocialProvider',
    definition(t) {
        t.model.id()
        t.model.type()
        t.model.email()
        t.model.phoneNumber()
        t.model.name()
        t.model.avatar()
        t.model.gender()
        t.model.birthday()
    }
})

export const UserSettingType = objectType({
    name: 'UserSetting',
    definition(t) {
        t.model("User").allowMatching()
        t.model("User").isPrivate()
        t.model("User").showActive()
        t.model("User").isPrivateJob()
        t.model("User").isPrivateDegree()
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
    }
})

export const AreaType = objectType({
    name: 'Area',
    definition(t) {
        t.model.id()
        t.model.area()
        t.model.city({ pagination: false, alias: 'cities' })
    }
})

export const CityType = objectType({
    name: 'City',
    definition(t) {
        t.model.id()
        t.model.city()
        t.model.area({ alias: 'areas' })
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
    }
})

export const UserAreaOtherPersonType = objectType({
    name: 'UserAreaOtherPerson',
    definition(t) {
        t.model.area()
        t.model.user()
    }
})

export const UserCityOtherPersonType = objectType({
    name: 'UserCityOtherPerson',
    definition(t) {
        t.model.city()
        t.model.user()
    }
})

export const UserPurposeUseAppType = objectType({
    name: 'UserPurposeUseApp',
    definition(t) {
        t.model.purpose()
        t.model.user()
    }
})

export const PurposeUseAppType = objectType({
    name: 'PurposeUseApp',
    definition(t) {
        t.model.id()
        t.model.value()
    }
})

export const MessageType = objectType({
    name: 'Message',
    definition(t) {
        t.model.id()
        t.model.message()
        t.model.createdAt()
        t.model.updatedAt()
        t.model.messageAttachment({ pagination: false })
        t.model.receiver()
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