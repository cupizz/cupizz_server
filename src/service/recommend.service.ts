import { Gender, User, UserWhereInput } from '@prisma/client';
import { AuthService, UserService } from '.';
import { Config } from '../config';
import Strings from '../constants/strings';
import { Context } from '../context';
import { ClientError } from '../model/error';
import { DefaultRole } from '../model/role';
import { prisma } from '../server';
import { logger } from '../utils/logger';

class RecommendService {
    public async getRecommendableUsers(ctx: Context): Promise<User[]> {
        AuthService.authenticate(ctx);
        const pageSize = Config.defaultPageSize.value;

        let data = (await prisma.recommendableUser.findMany({
            where: { userId: ctx.user.id },
            take: pageSize,
            include: { recommendableUser: true },
            orderBy: { index: 'asc' }
        })).map(e => e.recommendableUser);

        // Nếu trong database hiện không có thì generate ra list mới
        if (!data || data.length === 0) {
            data = await this.regenerateRecommendableUsers(ctx.user.id);
        } else if (data.length <= 3) {
            this.generateMoreRecommendableUsers(ctx.user.id);
        }

        return data;
    }

    public async dislikeUser(ctx: Context, targetUserId: string): Promise<void> {
        AuthService.authenticate(ctx);
        if (!(await prisma.dislikedUser.findOne({
            where: {
                userId_dislikedUserId: {
                    userId: ctx.user.id,
                    dislikedUserId: targetUserId
                }
            }
        })) && (await prisma.recommendableUser.findOne({
            where: {
                userId_recommendableUserId: {
                    userId: ctx.user.id,
                    recommendableUserId: targetUserId,
                }
            }
        }))) {
            try {
                await prisma.$transaction([
                    prisma.recommendableUser.delete({
                        where: {
                            userId_recommendableUserId: {
                                recommendableUserId: targetUserId,
                                userId: ctx.user.id,
                            }
                        }
                    }),
                    prisma.dislikedUser.create({
                        data: {
                            user: { connect: { id: ctx.user.id } },
                            dislikedUser: { connect: { id: targetUserId } }
                        },
                    })
                ])
                UserService.updateLikeDislikeCount(targetUserId, { ignoreLike: true });
            } catch (e) {
                logger(e);
            }
        }
    }

    public async undoDislike(ctx: Context): Promise<User> {
        AuthService.authenticate(ctx);
        const lastDislikedUser = await prisma.dislikedUser.findFirst({
            orderBy: { dislikedAt: 'desc' },
            include: { dislikedUser: true },
            where: { userId: { equals: ctx.user.id } }
        })

        if (!lastDislikedUser) {
            throw ClientError(Strings.error.noUserToUndo);
        }

        const topRecommendUser = await prisma.recommendableUser.findFirst({
            where: { userId: ctx.user.id },
            orderBy: { index: 'asc' }
        })
        try {
            await prisma.$transaction([
                prisma.recommendableUser.create({
                    data: {
                        user: { connect: { id: ctx.user.id } },
                        recommendableUser: { connect: { id: lastDislikedUser.dislikedUser.id } },
                        index: (topRecommendUser?.index || 0) - 1
                    }
                }),
                prisma.dislikedUser.delete({
                    where: {
                        userId_dislikedUserId: {
                            userId: ctx.user.id,
                            dislikedUserId: lastDislikedUser.dislikedUserId
                        }
                    }
                })
            ])
        } catch (e) {
            logger(e);
        }
        UserService.updateLikeDislikeCount(lastDislikedUser.dislikedUserId, { ignoreLike: true });
        return lastDislikedUser.dislikedUser;
    }

    public async regenerateRecommendableUsers(userId: string): Promise<User[]> {
        const result = await this._getMatchingUsers(userId);

        await prisma.$transaction([
            prisma.recommendableUser.deleteMany({ where: { userId } }),
            ...result.map((e, i) => prisma.recommendableUser.create({
                data: {
                    user: { connect: { id: userId } },
                    recommendableUser: { connect: { id: e.id } },
                    index: i + 1
                }
            }))
        ] as any[])

        return result;
    }

    public async generateMoreRecommendableUsers(userId: string): Promise<User[]> {
        const recommendUsers = (await prisma.recommendableUser.findMany({
            where: { userId }, orderBy: { index: 'asc' }
        }))
        const result = (await this._getMatchingUsers(userId))
            .filter(e => recommendUsers.findIndex(re => re.userId !== e.id));

        await prisma.$transaction(
            result.map(async (e, i) => await prisma.recommendableUser.create({
                data: {
                    user: { connect: { id: userId } },
                    recommendableUser: { connect: { id: e.id } },
                    index: recommendUsers[recommendUsers.length - 1].index + i + 1
                }
            }))
        )

        return result;
    }

    private async _getMatchingUsers(userId: string) {
        const user = await prisma.user.findOne({
            where: { id: userId },
            include: {
                dislikedUsers: true,
            }
        });

        const friendIds: string[] = (await prisma.friend.findMany({
            where: {
                OR: [
                    { senderId: { equals: userId } }, // Bỏ qua những người đã gửi
                    { acceptedAt: { not: { equals: null } } } // Bỏ qua bạn bè
                ],

            }
        })).map(e => e.senderId === userId ? e.receiverId : e.senderId);

        const now = new Date();
        const birthdayCondition: { min: Date, max: Date } =
        {
            min: new Date(now.getUTCFullYear() - (user.maxAgePrefer || Config.maxAge.value), 0, 1),
            max: new Date(now.getUTCFullYear() - (user.minAgePrefer || Config.minAge.value), 11, 31),
        };

        const where: UserWhereInput = {
            // Omission conditions
            NOT: { OR: [userId, ...friendIds, ...user.dislikedUsers.map(e => e.dislikedUserId)].map(e => ({ id: { equals: e } })) },
            roleId: { not: { equals: DefaultRole.admin.id } },

            // Filter conditions
            OR: [
                {
                    birthday: { lte: birthdayCondition.max, gte: birthdayCondition.min },
                    height: { lte: user.maxHeightPrefer || Config.maxHeight.value, gte: user.minHeightPrefer || Config.minHeight.value },
                },
                {
                    birthday: { lte: birthdayCondition.max, gte: birthdayCondition.min },
                    height: { equals: null }
                },
                {
                    birthday: { equals: null },
                    height: { lte: user.maxHeightPrefer || Config.maxHeight.value, gte: user.minHeightPrefer || Config.minHeight.value },
                },
                {
                    birthday: { equals: null },
                    height: { equals: null }
                }
            ],
            AND: [
                {
                    OR: [
                        { gender: { in: user.genderPrefer.length > 0 ? user.genderPrefer : Object.values(Gender) }, },
                        ...user.genderPrefer.includes('other') ? [{ gender: { equals: null }, }] : [],
                    ]
                },
                {
                    OR: [
                        { coverId: { not: { equals: null } } },
                        { avatarId: { not: { equals: null } } },
                    ]
                }
            ],
            // TODO calculate distance
            allowMatching: true,
            isPrivate: false,
            deletedAt: null,
        }

        return await prisma.user.findMany({ where, take: 20, orderBy: { lastOnline: 'desc' } });
    }
}


const _ = new RecommendService();
export { _ as RecommendService };
