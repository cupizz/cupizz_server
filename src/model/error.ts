import { ApolloError, AuthenticationError } from "apollo-server-express";
import Strings from "../constants/strings";

export const ClientError = (message: string) => new ApolloError(message, 'CLIENT_ERROR');
export const ValidationError = (message: string) => ClientError(message);

export const ErrorEmailExisted = ClientError(Strings.error.emailExisted);
export const ErrorEmailIncorrectForm = ClientError(Strings.error.emailIncorrectForm);
export const ErrorEmailNotFound = ClientError(Strings.error.emailNotFound);
export const ErrorIncorrectPassword = ClientError(Strings.error.incorrectPassword);
export const ErrorOtpIncorrect = ClientError(Strings.error.otpIncorrect);
export const ErrorTokenExpired = ClientError(Strings.error.tokenExpired);
export const ErrorTokenIncorrect = ClientError(Strings.error.tokenIncorrect);

export const ErrorUnAuthenticate = (message?: string) => new AuthenticationError(message || Strings.error.unAuthenticate);

export class ForbiddenError extends AuthenticationError {
    constructor() {
        super('Forbidden');
    }
}