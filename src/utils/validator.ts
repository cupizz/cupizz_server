import { Prisma } from "@prisma/client";
import { Config } from "../config";
import Strings from "../constants/strings";
import { ValidationError } from "../model/error";
import { FriendStatusEnum } from "../schema/types";

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
            error = 'Password phải ít hơn 24 ký tự';
        } else if (password.length < 8) {
            error = 'Password phải từ 8 ký tự trở lên';
        } else if (!regexp.test(password)) {
            error = "Password chỉ bao gồm chữ, số và các ký tự @#\\$%&?!"
        }

        if (throwError && error) {
            throw ValidationError(error);
        }

        return error;
    }

    public nickname(value: string, throwError: boolean = true): string {
        let error: string;

        if (value.length > 20) {
            error = 'Vui lòng nhập trong vòng 20 ký tự';
        }

        if (throwError && error) {
            throw ValidationError(error);
        }

        return error;
    }

    public isFriend(value: FriendStatusEnum): boolean {
        return value === FriendStatusEnum.friend || value === FriendStatusEnum.me;
    }

    public phoneNumber(value: string | Prisma.StringFieldUpdateOperationsInput, throwError: boolean = true): string {
        let error: string;
        const regexp = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
        const _value = typeof value === 'string' ? value : value.set;

        if (!regexp.test(_value)) {
            error = 'Số điện thoại không đúng định dạng'
        }

        if (throwError && error) {
            throw ValidationError(error);
        }

        return error;
    }

    public maxPagination(take: number, throwError: boolean = true): string {
        let error: string;

        if (take > Config.maxPaginationSize.value) {
            error = 'Max pagination size is ' + Config.maxPaginationSize.value;
        }

        if (throwError && error) {
            throw ValidationError(error);
        }

        return error;
    }
}

const _ = new Validator();
export { _ as Validator };
