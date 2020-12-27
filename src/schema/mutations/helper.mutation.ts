import { mutationField } from "@nexus/schema";
import { HaveKids, LookingFor, Religious, UsualType } from "@prisma/client";
import { random } from "faker";
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

export const seedUserInfoMutation = mutationField(
    'seedUserInfo', {
    type: 'Boolean',
    resolve: async (_root, _args, ctx) => {
        AuthService.authorize(ctx, { values: [Permission.user.update] });
        const allUser = await prisma.user.findMany({ where: { socialProvider: { some: { type: 'email', id: { contains: 'test' } } } } });
        await prisma.$transaction(
            allUser.map(e => prisma.user.update({
                where: { id: e.id },
                data: {
                    drinking: Object.values(UsualType)[random.number(Object.values(UsualType).length)],
                    smoking: Object.values(UsualType)[random.number(Object.values(UsualType).length)],
                    religious: Object.values(Religious)[random.number(Object.values(Religious).length)],
                    lookingFors: Object.values(LookingFor)[random.number(Object.values(LookingFor).length)],
                    yourKids: Object.values(HaveKids)[random.number(Object.values(HaveKids).length)],
                    religiousPrefer: getRandomSubarray(Object.values(Religious)),
                    theirKids: Object.values(HaveKids)[random.number(Object.values(HaveKids).length)],
                }
            }))
        )
        return true;
    }
})

function getRandomSubarray<T>(arr: T[], size?: number): T[] {
    const rSize = size ?? arr.length;
    var shuffled = arr.slice(0), i = arr.length, min = i - rSize, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}