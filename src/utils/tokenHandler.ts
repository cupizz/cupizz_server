import bcrypt from 'bcryptjs';

const tokenHandler = {
    encode: (password: string): string => {
        return bcrypt.hashSync(password, 8);
    },

    compare: (password: string, encodePassword: string): boolean => {
        return bcrypt.compareSync(password, encodePassword);
    },

    validate: (password: string) => {
        if (password.length < (process.env.MIN_PASSWORD_LENGTH || 8)) {
            return false;
        }

        return true;
    }
};

export { tokenHandler as TokenHandler };