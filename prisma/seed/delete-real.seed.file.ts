import { PrismaClient, SocialProviderType } from "@prisma/client";
import { SocialProvider, SocialProviderEnumType } from "../../src/schema/types";

export const deleteRealUser = async () => {
    const db = new PrismaClient();
    let count = await db.userImage.deleteMany({
        where: {
            user: {
                socialProvider: {
                    some: {
                        type: 'email',
                        id: {
                            startsWith: 'tinder',
                            endsWith: '@cupizz.cf'
                        }
                    }
                }
            }
        }
    })
    console.log(`Deleted ${count.count} images`);
    count = await db.socialProvider.deleteMany({
        where: {
            type: 'email',
            id: {
                startsWith: 'tinder',
                endsWith: '@cupizz.cf'
            },
        }
    })
    console.log(`Deleted ${count.count} sns`);
    count = await db.friend.deleteMany({
        where: {
            OR: [
                {
                    sender: {
                        socialProvider: {
                            none: { type: { in: Object.values(SocialProviderType) } }
                        }
                    },
                }, {
                    receiver: {
                        socialProvider: {
                            none: { type: { in: Object.values(SocialProviderType) } }
                        }
                    }
                }
            ]
        }
    })
    console.log(`Deleted ${count.count} friends`);
    count = await db.dislikedUser.deleteMany({
        where: {
            OR: [
                {
                    dislikedUser: {
                        socialProvider: {
                            none: { type: { in: Object.values(SocialProviderType) } }
                        }
                    },
                }, {
                    user: {
                        socialProvider: {
                            none: { type: { in: Object.values(SocialProviderType) } }
                        }
                    }
                }
            ]
        }
    })
    console.log(`Deleted ${count.count} dislikedUser`);
    count = await db.recommendableUser.deleteMany({
        where: {
            OR: [
                {
                    recommendableUser: {
                        socialProvider: {
                            none: { type: { in: Object.values(SocialProviderType) } }
                        }
                    },
                }, {
                    user: {
                        socialProvider: {
                            none: { type: { in: Object.values(SocialProviderType) } }
                        }
                    }
                }
            ]
        }
    })
    console.log(`Deleted ${count.count} recommendableUser`);
    count = await db.notificationReceiver.deleteMany({
        where: {
            receiver: {
                socialProvider: {
                    none: { type: { in: Object.values(SocialProviderType) } }
                }
            }
        }
    })
    console.log(`Deleted ${count.count} notificationReceiver`);
    count = await db.conversationMember.deleteMany({
        where: {
            conversation: {
                members: {
                    some: {
                        user: {
                            socialProvider: {
                                none: { type: { in: Object.values(SocialProviderType) } }
                            }
                        }
                    }
                }
            }
        }
    })
    console.log(`Deleted ${count.count} conversationMember`);
    count = await db.conversation.deleteMany({
        where: {
            members: {
                none: {

                }
            }
        }
    })
    console.log(`Deleted ${count.count} conversationMember`);
    count = await db.user.deleteMany({
        where: {
            socialProvider: {
                none: { type: { in: Object.values(SocialProviderType) } }
            }
        }
    })
    console.log(`Deleted ${count.count} users`);
    count = await db.file.deleteMany({
        where: {
            messageId: { equals: null },
            userAvatar: { none: { id: { gt: '' } } },
            userCover: { none: { id: { gt: '' } } },
            userImage: { none: { id: { gt: '' } } },
            messageAttachment: { none: { messageId: { gt: '' } } },
        }
    })
    console.log(`Deleted ${count.count} files are not used`);
};

deleteRealUser();