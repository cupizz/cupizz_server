export default class Strings {
    static error = {
        incorrectPassword: '入力されたパスワードと確認用パスワードが一致しません。',
        emailNotFound: 'Email not found',
        emailExisted: 'Email existed',
        emailIncorrectForm: 'メールアドレスの形式に不備があります',
        otpIncorrect: '入力されたコードが一致しません。',
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