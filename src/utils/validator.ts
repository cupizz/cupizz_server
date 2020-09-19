import Strings from "../constants/strings";
import { ValidationError } from "../model/error";

class Validator {
    public email(email: string, throwError: boolean = true) {
        const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (throwError) {
            if (!emailRegexp.test(email)) {
                throw ValidationError(Strings.error.emailIncorrectForm);
            }
        }

        return emailRegexp.test(email);
    }

    public password(password: string, throwError: boolean = true): string {
        let error: string;
        const regexp = /^([@#$%&?!0-9A-Za-z\s]*)$/;

        if (password.length > 24) {
            error = '24文字以内で入力してください';
        } else if (password.length < 8) {
            error = '8文字以上で入力してください';
        } else if (!regexp.test(password)) {
            error = "半角英大文字、半角英小文字、半角数字、記号@#\\$%&?!で入力してください"
        }

        if (throwError && error) {
            throw ValidationError(error);
        }

        return error;
    }

    public nickname(value: string, throwError: boolean = true): string {
        let error: string;

        if (value.length < 24) {
            error = '20文字以内で入力してください';
        }

        if (throwError && error) {
            throw ValidationError(error);
        }

        return error;
    }
}

const _ = new Validator();
export { _ as Validator };
