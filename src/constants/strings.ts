export default class Strings {
    static inDevelopment = 'Tính năng đang phát triển';
    
    static notification = {
        newLikeContent: (fromUserName: string) => `${fromUserName} đã thích bạn`,
        newMatchContent: (fromUserName: string) => `Bạn và ${fromUserName} đã ghép đôi thành công`,
        newMessageTitle: (fromUserName: string) => `${fromUserName}`
    }
    
    static error = {
        incorrectPassword: 'Mật khẩu không chính xác.',
        userNotFound: 'Không tìm thấy người dùng.',
        emailNotFound: 'Email not found',
        emailExisted: 'Email existed',
        emailIncorrectForm: 'Email không đúng định dạng',
        otpIncorrect: 'Otp không đúng.',
        unAuthorize: 'Unauthorize',
        unAuthenticate: 'Please login before',
        lockedAccount: 'Tài khoản này đã bị khóa, vui lòng liên hệ BQT để được hỗ trợ.',
        trialExpired: 'Thời hạn dùng thử đã hết. \nHãy nâng cấp tài khoản để tiếp tục sử dụng ứng dụng.',
        tokenExpired: 'Token expired',
        tokenIncorrect: 'Token incorrect',
        cannotAuthenticateGoogleAccount: 'Can not authenticate Google account',
        cannotAuthenticateFacebookAccount: 'Can not authenticate Facebook account',
        tempFileNotFound: (fileName?: string) => `Temp file ${fileName} not found`,
        cannotDoOnYourself: 'Cannot do on yourself',
        cannotAddFriendTwice: 'Cannot add friend twice',
        youWereBothFriendOfEachOther: 'You were both friend of each other',
        youWereBothNotFriendOfEachOther: 'You were both not friend of each other',
        accountHasBeenDeleted: 'Account has been deleted',
        cannotSendMessageToThisConversation: 'Cannot send message to this conversation',
        noUserToUndo: 'Không còn ai để quay lại',
        notificationIsNotBelongToYou: 'Thông báo này không phải của bạn',
        mustHaveConversationIdOrUserId: 'Must have conversationId or userId',
        contentMustBeNotEmpty: 'Vui lòng nhập nội dung tin nhắn!',
    }
}