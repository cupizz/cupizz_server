import { mutationField } from "@nexus/schema";
import { HaveKids, LookingFor, Religious, Role, UsualType } from "@prisma/client";
import { random } from "faker";
import { Permission } from "../../model/permission";
import { DefaultRole } from "../../model/role";
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
        const allUser = await prisma.user.findMany({ where: { roleId: DefaultRole.tester.id } });
        await prisma.$transaction(
            allUser.map(e => prisma.user.update({
                where: { id: e.id },
                data: {
                    drinking: Object.values(UsualType)[random.number(Object.values(UsualType).length)],
                    smoking: Object.values(UsualType)[random.number(Object.values(UsualType).length)],
                    religious: Object.values(Religious)[random.number(Object.values(Religious).length)],
                    lookingFors: Object.values(LookingFor)[random.number(Object.values(LookingFor).length)],
                    yourKids: Object.values(HaveKids)[random.number(Object.values(HaveKids).length)],
                    religiousPrefer: _getRandomSubarray(Object.values(Religious)),
                    theirKids: Object.values(HaveKids)[random.number(Object.values(HaveKids).length)],
                }
            }))
        )
        return true;
    }
})

export const reseedRoleMutation = mutationField(
    'reseedRole', {
    type: 'Boolean',
    resolve: async (_root, _args, ctx) => {
        AuthService.authorize(ctx, { values: [Permission.role.update, Permission.role.create] });
        await prisma.$transaction(
            Object.values(DefaultRole).map((e: Role) => prisma.role.upsert({
                where: { id: e.id },
                create: e,
                update: e,
            }))
        )
        return true;
    }
})

export const updateTesterUserMutation = mutationField(
    'updateTesterUser', {
    type: 'Boolean',
    resolve: async (_root, _args, ctx) => {
        AuthService.authorize(ctx, { values: [Permission.user.update] });
        const users = await prisma.user.findMany({ where: { socialProvider: { some: { type: 'email', id: { contains: 'test' } } } } });
        await prisma.$transaction(
            users.map(e => prisma.user.update({
                where: { id: e.id },
                data: { role: { connect: { id: DefaultRole.tester.id } } }
            }))
        )
        return true;
    }
})

function _getRandomSubarray<T>(arr: T[], size?: number): T[] {
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