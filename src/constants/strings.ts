export default class Strings {
    static inDevelopment = 'Tính năng đang phát triển';
    static error = {
        incorrectPassword: 'Mật khẩu không chính xác.',
        emailNotFound: 'Email not found',
        emailExisted: 'Email existed',
        emailIncorrectForm: 'Email không đúng định dạng',
        otpIncorrect: 'Otp không đúng.',
        unAuthenticate: 'Please login before',
        tokenExpired: 'Token expired',
        tokenIncorrect: 'Token incorrect',
        cannotAuthenticateGoogleAccount: 'Can not authenticate Google account',
        cannotAuthenticateFacebookAccount: 'Can not authenticate Facebook account',
        tempFileNotFound: (fileName?: string) => `Temp file ${fileName} not found`,
        cannotDoOnYourself: 'Cannot do on yourself',
        cannotAddFriendTwice: 'Cannot add friend twice',
        youWereBothFriendOfEachOther: 'You were both friend of each other',   
        youWereBothNotFriendOfEachOther: 'You were both not friend of each other',   
    }
}