import { PrismaClient, AgeConditionCreateInput } from "@prisma/client";

export const seedAgeCondition = async () => {
    const db = new PrismaClient();
    seedData.forEach(async e => await db.ageCondition.create({ data: e }));
};

const seedData: AgeConditionCreateInput[] = [
    { name: '2x', min: 20, max: 29, sortOrder: 1 },
    { name: '3x', min: 30, max: 39, sortOrder: 2 },
    { name: '4x', min: 40, max: 49, sortOrder: 3 },
    { name: '5x', min: 50, max: 59, sortOrder: 4 },
    { name: '6x+', min: 60, sortOrder: 5 },
]