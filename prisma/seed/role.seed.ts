import { PrismaClient, Role } from "@prisma/client";
import { DefaultRole } from "../../src/model/role";

export const seedRole = async () => {
    const db = new PrismaClient();
    return await Promise.all(Object.values(DefaultRole)
        .map((e: Role) => db.role.create({
            data: {
                id: e.id,
                name: e.name,
                description: e.description,
                permissions: { set: e.permissions }
            }
        }
        )))
};