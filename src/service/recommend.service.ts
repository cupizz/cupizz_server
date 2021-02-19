import {Gender, HaveKids, Religious, User, UserWhereInput, UsualType,} from '@prisma/client'
import {AuthService, UserService} from '.'
import {Config} from '../config'
import Strings from '../constants/strings'
import {Context} from '../context'
import {ClientError} from '../model/error'
import {DefaultRole} from '../model/role'
import {prisma} from '../server'
import {logger} from '../utils/logger'
import request from 'request'
import jwt from 'jsonwebtoken'
import {calculateAge} from '../utils/helper'
import {JwtAuthPayload} from "../model/jwtPayload";

const {AI_MATCHER_URL, BASE_URL} = process.env

class RecommendService {
    public async getRecommendableUsers(ctx: Context): Promise<User[]> {
        AuthService.authenticate(ctx)
        const pageSize = Config.defaultPageSize.value

        let data = (
            await prisma.recommendableUser.findMany({
                where: {userId: ctx.user.id},
                take: pageSize,
                include: {recommendableUser: true},
                orderBy: {index: 'asc'},
            })
        ).map((e) => e.recommendableUser)

        // Nếu trong database hiện không có thì generate ra list mới
        if (!data || data.length === 0) {
            data = await this.regenerateRecommendableUsers(ctx.user.id)
        } else if (data.length <= 20) {
            this.generateMoreRecommendableUsers(ctx.user.id).then()
        }

        return data
    }

    public async dislikeUser(ctx: Context, targetUserId: string): Promise<void> {
        AuthService.authenticate(ctx)
        if (
            !(await prisma.dislikedUser.findOne({
                where: {
                    userId_dislikedUserId: {
                        userId: ctx.user.id,
                        dislikedUserId: targetUserId,
                    },
                },
            })) &&
            (await prisma.recommendableUser.findOne({
                where: {
                    userId_recommendableUserId: {
                        userId: ctx.user.id,
                        recommendableUserId: targetUserId,
                    },
                },
            }))
        ) {
            try {
                await prisma.$transaction([
                    prisma.recommendableUser.delete({
                        where: {
                            userId_recommendableUserId: {
                                recommendableUserId: targetUserId,
                                userId: ctx.user.id,
                            },
                        },
                    }),
                    prisma.dislikedUser.create({
                        data: {
                            user: {connect: {id: ctx.user.id}},
                            dislikedUser: {connect: {id: targetUserId}},
                        },
                    }),
                ])
                UserService.updateLikeDislikeCount(targetUserId, {ignoreLike: true}).then()
            } catch (e) {
                logger(e)
            }
        }
    }

    public async undoDislike(ctx: Context): Promise<User> {
        AuthService.authenticate(ctx)
        const lastDislikedUser = await prisma.dislikedUser.findFirst({
            orderBy: {dislikedAt: 'desc'},
            include: {dislikedUser: true},
            where: {userId: {equals: ctx.user.id}},
        })

        if (!lastDislikedUser) {
            throw ClientError(Strings.error.noUserToUndo)
        }

        const topRecommendUser = await prisma.recommendableUser.findFirst({
            where: {userId: ctx.user.id},
            orderBy: {index: 'asc'},
        })
        try {
            await prisma.$transaction([
                prisma.recommendableUser.create({
                    data: {
                        user: {connect: {id: ctx.user.id}},
                        recommendableUser: {
                            connect: {id: lastDislikedUser.dislikedUser.id},
                        },
                        index: (topRecommendUser?.index || 0) - 1,
                    },
                }),
                prisma.dislikedUser.delete({
                    where: {
                        userId_dislikedUserId: {
                            userId: ctx.user.id,
                            dislikedUserId: lastDislikedUser.dislikedUserId,
                        },
                    },
                }),
            ])
        } catch (e) {
            logger(e)
        }
        UserService.updateLikeDislikeCount(lastDislikedUser.dislikedUserId, {
            ignoreLike: true,
        }).then()
        return lastDislikedUser.dislikedUser
    }

    public async regenerateRecommendableUsers(userId: string): Promise<User[]> {
        const result = await this._getMatchingUsersDefault(userId)

        await prisma.$transaction([
            prisma.recommendableUser.deleteMany({where: {userId}}),
            ...result.map((e, i) =>
                prisma.recommendableUser.create({
                    data: {
                        user: {connect: {id: userId}},
                        recommendableUser: {connect: {id: e.id}},
                        index: i + 1,
                    },
                }),
            ),
        ] as any[])

        return result
    }

    public async generateMoreRecommendableUsers(userId: string): Promise<User[]> {
        const recommendUsers = await prisma.recommendableUser.findMany({
            where: {userId},
            orderBy: {index: 'asc'},
        })
        const result = (await this._getMatchingUsers(userId)).filter((e) =>
            recommendUsers.findIndex((re) => re.userId !== e.id),
        )

        await prisma.$transaction(
            result.map(
                async (e, i) =>
                    await prisma.recommendableUser.create({
                        data: {
                            user: {connect: {id: userId}},
                            recommendableUser: {connect: {id: e.id}},
                            index: recommendUsers[recommendUsers.length - 1].index + i + 1,
                        },
                    }),
            ),
        )

        return result
    }

    public async trainModelRecommend(): Promise<any> {
        const user = await prisma.user.findFirst({
            where: {roleId: DefaultRole.admin.id},
        })
        const token = this.sign({userId: user.id} as JwtAuthPayload)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                userDeviceTokens: {
                    // Xóa các device bị trùng, và token hết hạn
                    deleteMany: {
                        OR: [
                            { expireAt: { lt: new Date() } }
                        ]
                    },
                    create: {
                        token,
                        expireAt: new Date(Config.loginTokenExpireTime.value * 60 * 1000 + Date.now()),
                    }
                }
            }
        })

        const linkData = `${BASE_URL}/export/users?authorization=${token}`
        request.post(
            `${AI_MATCHER_URL}/train/`,
            {
                headers: {'content-type': 'application/json'},
                body: {
                    link_data: linkData,
                },
                json: true,
            },
            function (error, response, body) {
                logger(error)
            },
        )
    }

    public sign<T extends object>(payload: T, expiresIn?: number): string {
        const expire = expiresIn || Config.loginTokenExpireTime.value
        return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
            expiresIn: `${expire}m`,
        })
    }

    private async _getMatchingUsers(userId: string) {
        const user = await prisma.user.findOne({
            where: {id: userId},
            include: {
                dislikedUsers: true,
                hobbies: true,
            },
        })

        const friendIds: string[] = (
            await prisma.friend.findMany({
                where: {
                    OR: [
                        {senderId: {equals: userId}}, // Bỏ qua những người đã gửi
                        {acceptedAt: {not: {equals: null}}}, // Bỏ qua bạn bè
                    ],
                },
            })
        ).map((e) => (e.senderId === userId ? e.receiverId : e.senderId))
        let where: UserWhereInput = {}

        if (user.birthday && user.height && user.latitude && user.longitude) {
            where = await this._recommendByModel(user, userId, friendIds);
        }
        if (!where) {
            where = await this._defaultRecommend(user, userId, friendIds);
        }

        return await prisma.user.findMany({
            where,
            orderBy: {lastOnline: 'desc'},
        })
    }

    private async _getMatchingUsersDefault(userId: string) {
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

        const where = await this._defaultRecommend(user, userId, friendIds);

        return await prisma.user.findMany({ where, take: 20, orderBy: { lastOnline: 'desc' } });
    }

    private async _recommendByModel(
        user: User & { dislikedUsers: any[]; hobbies: any[] },
        userId: string,
        friendIds: string[],
    ) {
        try {
            const res = await new Promise<request.Response>((resolve, reject) => {
                const body = {
                    list_exclude_id: [...friendIds],
                    id: userId,
                    nickname: user.nickName,
                    introduction: user.introduction,
                    age: calculateAge(user.birthday),
                    gender: Object.values(Gender).indexOf(user.gender),
                    height: user.height,
                    x: user.latitude,
                    y: user.longitude,
                    smoking: Object.values(UsualType).indexOf(user.smoking),
                    drinking: Object.values(UsualType).indexOf(user.drinking),
                    your_kids: Object.values(HaveKids).indexOf(user.yourKids),
                    religious: Object.values(Religious).indexOf(user.religious),
                    hobbies: user.hobbies.map((h: any) => h.value),
                    min_age_prefer: user.minAgePrefer || 18,
                    max_age_prefer: user.maxAgePrefer || 50,
                    min_height_prefer: user.minHeightPrefer || 140,
                    max_height_prefer: user.maxHeightPrefer || 200,
                    gender_prefer: user.genderPrefer.length ? user.genderPrefer.map((gender) => {
                        return Object.values(Gender).indexOf(gender)
                    }) : Object.values(Gender).map((gender) => {
                        return Object.values(Gender).indexOf(gender);
                    }),
                    distance_prefer: user.distancePrefer || 100,
                    limit: -1,
                };
                request.post(
                    `${AI_MATCHER_URL}/recommend/`,
                    {
                        headers: {'content-type': 'application/json'},
                        body: body,
                        json: true,
                    },
                    function (error, response) {
                        if (error) {
                            reject(error)
                        } else {
                            resolve(response)
                        }
                    },
                )
            })
            if (res.body.data && res.body.data.length) {
                const where: UserWhereInput = {
                    id: {
                        in: res.body.data,
                    },
                }
                return where
            }
            return null;
        } catch (e) {
            logger('Get recommend from model failed: ' + e);
            return null;
        }
    }

    private async _defaultRecommend(
        user: User & { dislikedUsers: any[] },
        userId: string,
        friendIds: string[],
    ) {
        const now = new Date()
        const birthdayCondition: { min: Date; max: Date } = {
            min: new Date(
                now.getUTCFullYear() - (user.maxAgePrefer || Config.maxAge.value),
                0,
                1,
            ),
            max: new Date(
                now.getUTCFullYear() - (user.minAgePrefer || Config.minAge.value),
                11,
                31,
            ),
        }

        const where: UserWhereInput = {
            // Omission conditions
            NOT: {
                OR: [
                    userId,
                    ...friendIds,
                    ...user.dislikedUsers.map((e: any) => e.dislikedUserId),
                ].map((e) => ({id: {equals: e}})),
            },
            roleId: {not: {equals: DefaultRole.admin.id}},

            // Filter conditions
            OR: [
                {
                    birthday: {lte: birthdayCondition.max, gte: birthdayCondition.min},
                    height: {
                        lte: user.maxHeightPrefer || Config.maxHeight.value,
                        gte: user.minHeightPrefer || Config.minHeight.value,
                    },
                },
                {
                    birthday: {lte: birthdayCondition.max, gte: birthdayCondition.min},
                    height: {equals: null},
                },
                {
                    birthday: {equals: null},
                    height: {
                        lte: user.maxHeightPrefer || Config.maxHeight.value,
                        gte: user.minHeightPrefer || Config.minHeight.value,
                    },
                },
                {
                    birthday: {equals: null},
                    height: {equals: null},
                },
            ],
            AND: [
                {
                    OR: [
                        {
                            gender: {
                                in:
                                    user.genderPrefer.length > 0
                                        ? user.genderPrefer
                                        : Object.values(Gender),
                            },
                        },
                        ...(user.genderPrefer.includes('other')
                            ? [{gender: {equals: null}}]
                            : []),
                    ],
                },
                {
                    OR: [
                        {coverId: {not: {equals: null}}},
                        {avatarId: {not: {equals: null}}},
                    ],
                },
            ],
            // TODO calculate distance
            allowMatching: true,
            isPrivate: false,
            deletedAt: null,
        }
        return where
    }
}

const _ = new RecommendService()
export {_ as RecommendService}
