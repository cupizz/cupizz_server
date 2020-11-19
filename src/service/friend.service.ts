import { Friend, FriendWhereInput, UserWhereInput } from '@prisma/client';
import { Context } from '../context';
import { NexusGenEnums } from '../schema/generated/nexus';
import { prisma } from '../server';

class FriendService {
    public async getFriendsSortAge(ctx: Context, type: NexusGenEnums['FriendTypeEnumInput'], page: number, pageSize: number): Promise<Friend[]> {
        let where: FriendWhereInput;
        switch (type) {
            case 'friend':
                where = {
                    OR: [
                        { senderId: { equals: ctx.user.id } },
                        { receiverId: { equals: ctx.user.id } },
                    ],
                    NOT: [{ acceptedAt: null }]
                }
                break;
            case 'received':
                where = {
                    receiverId: { equals: ctx.user.id },
                    acceptedAt: null
                }
                break;
            case 'sent':
                where = {
                    senderId: { equals: ctx.user.id },
                    acceptedAt: null
                }
                break;
            default:
                where = {
                    OR: [
                        { senderId: { equals: ctx.user.id } },
                        { receiverId: { equals: ctx.user.id } },
                    ],
                };
                break;
        }

        // TODO Sửa lại như sau: Đếm ds friend trong 1 khoảng tuổi xung quanh tuổi của mình, nếu đủ số lượng thì chiến, ko thì tăng khoảng lên đếm tiếp
        const friends = await prisma.friend.findMany({
            where,
            include: { sender: true, receiver: true }
        })

        const startIndex = pageSize * ((page ?? 1) - 1);
        return friends.sort((a, b) => {
            const _a = Math.abs(a.sender.birthday.getTime() - a.receiver.birthday.getTime());
            const _b = Math.abs(b.sender.birthday.getTime() - b.receiver.birthday.getTime());
            return _a === _b ? 0 : _a > _b ? 1 : -1;
        }).slice(startIndex, startIndex + pageSize)
    }

    public async getFriendsSortLogin(ctx: Context, type: NexusGenEnums['FriendTypeEnumInput'], page: number, pageSize: number): Promise<Friend[]> {
        let where: UserWhereInput;
        switch (type) {
            case 'friend':
                where = {
                    OR: [
                        { senderFriend: { some: { receiverId: { equals: ctx.user.id }, NOT: { acceptedAt: null } } } },
                        { receiverFriend: { some: { senderId: { equals: ctx.user.id }, NOT: { acceptedAt: null } } } },
                    ]
                }
                break;
            case 'received':
                where = { senderFriend: { some: { receiverId: { equals: ctx.user.id }, acceptedAt: null } } };
                break;
            case 'sent':
                where = { receiverFriend: { some: { senderId: { equals: ctx.user.id }, acceptedAt: null } } };
                break;
            default:
                where = {
                    OR: [
                        { senderFriend: { some: { receiverId: { equals: ctx.user.id } } } },
                        { receiverFriend: { some: { senderId: { equals: ctx.user.id } } } },
                    ],
                };
                break;
        }

        const friends = (await prisma.user.findMany({
            where,
            orderBy: { lastOnline: 'desc' },
            take: pageSize,
            skip: pageSize * ((page ?? 1) - 1),
        }));
        const friendIds = friends.map(e => e.id);

        const friendsData = await prisma.friend.findMany({
            where: {
                OR: [
                    { senderId: { equals: ctx.user.id }, receiverId: { in: friendIds } },
                    { receiverId: { equals: ctx.user.id }, senderId: { in: friendIds } },
                ]
            },
            include: { receiver: true, sender: true },
        });

        console.log(friends.sort((a, b) => a.showActive === b.showActive ? 0 : a.showActive ? -1 : 1).map(e => ({a: e.showActive, b: e.lastOnline})))

        return friends.sort((a, b) => a.showActive === b.showActive ? 0 : a.showActive ? -1 : 1)
            .map(e => friendsData.find(f => {
                if (f.senderId === ctx.user.id) {
                    return f.receiverId === e.id;
                } else {
                    return f.senderId === e.id;
                }
            }))
    }

    public async getFriendsSortNew(ctx: Context, type: NexusGenEnums['FriendTypeEnumInput'], page: number, pageSize: number): Promise<Friend[]> {
        let where: FriendWhereInput;
        switch (type) {
            case 'friend':
                where = {
                    OR: [
                        { senderId: { equals: ctx.user.id } },
                        { receiverId: { equals: ctx.user.id } },
                    ],
                    NOT: [{ acceptedAt: null }]
                }
                break;
            case 'received':
                where = {
                    receiverId: { equals: ctx.user.id },
                    acceptedAt: null
                }
                break;
            case 'sent':
                where = {
                    senderId: { equals: ctx.user.id },
                    acceptedAt: null
                }
                break;
            default:
                where = {
                    OR: [
                        { senderId: { equals: ctx.user.id } },
                        { receiverId: { equals: ctx.user.id } },
                    ],
                };
                break;
        }

        return await prisma.friend.findMany({
            where,
            orderBy: {
                updatedAt: 'desc',
            },
            take: pageSize,
            skip: pageSize * ((page ?? 1) - 1)
        })
    }
}

const _ = new FriendService();
export { _ as FriendService };
