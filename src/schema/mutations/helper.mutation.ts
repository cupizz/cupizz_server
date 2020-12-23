import { mutationField } from "@nexus/schema";
import { Permission } from "../../model/permission";
import { prisma } from "../../server";
import { AuthService, UserService } from "../../service";

export const refreshLikeDislikeCountAllUsersMutation = mutationField(
    'refreshLikeDislikeCountAllUsers', {
    type: 'Boolean',
    resolve: async (_root, _args, ctx) => {
        AuthService.authorize(ctx, { values: [Permission.user.update] });
        const allUser = await prisma.user.findMany({});
        await Promise.all(allUser.map(u => UserService.updateLikeDislikeCount(u.id)))
        return true;
    }
})