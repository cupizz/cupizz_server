import { queryField } from "@nexus/schema";
import { AuthService } from "../../service";

export const MeQuery = queryField('me', {
    type: 'User',
    resolve: (_root, _args, ctx, _info) => {
        AuthService.authenticate(ctx);
        return ctx.user;
    }
})