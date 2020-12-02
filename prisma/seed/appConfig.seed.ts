import { PrismaClient } from "@prisma/client";
import faker from 'faker/locale/vi';
import { Config } from "../../src/config";

export const defaultHobbies = [
    'Làm vườn hoa hoặc rau',
    'Cho ăn và quan sát các loài chim địa phương',
    'Nuôi hoặc chăm sóc động vật',
    'Vẽ tranh, Điêu khắc',
    'Nhiếp ảnh',
    'Thổi gốm hoặc thủy tinh',
    'Làm đồ trang sức',
    'Trang trí nội thất',
    'Sáng tạo nội dung',
    'Hát, sáng tác hoặc nhảy',
    'Xem phim',
    'Chơi bài hoặc trò chơi trên bàn',
    'Câu đố',
    'Giao lưu với Twitter, Facebook hoặc Skype',
    'Nghiên cứu và duyệt Internet',
    'Chơi trò chơi điện tử',
    'Viết blog',
    'Đọc sách, báo, tiểu thuyết',
    'Tham gia Marathons',
    'Xây dựng cơ thể và tập thể dục',
    'Nhảy dây',
    'Võ thuật',
    'Ăn uống lành mạnh',
    'Yoga hoặc thiền',
    'Săn bắn hoặc câu cá',
    'Thể thao mùa đông',
    'Cuộc đua',
    'Thể thao dưới nước',
    'Đi bộ đường dài hoặc Leo núi',
    'Sưu tầm',
    'Mua sắm',
    'Tiệc tùng',
    'Nấu ăn',
    'Nhảy Bungee và Thể thao mạo hiểm',
    'Học điều gì đó mới và khó',
    'Buôn bán',
    'Trồng rau nuôi cá',
];

export const seedAppConfig = async () => {
    const db = new PrismaClient();
    await Promise.all(
        Object.keys(Config).map(async (e, i) => {
            return await db.appConfig.create({
                data: {
                    id: e,
                    name: e,
                    data: Object.values(Config)[i]
                }
            })
        })
    )

    await Promise.all(
        [
            ...defaultHobbies.map(async e => await db.hobbyValue.create({
                data: { value: e }
            })),
        ]
    )
};

export const seedQuestion = async () => {
    const db = new PrismaClient();
    
    await Promise.all(
        Array.from(Array(10).keys()).map(async () => await db.question.create({
            data: {
                content: faker.lorem.sentence(),
                color: Math.floor(Math.random() * 16777215).toString(16),
                textColor: Math.floor(Math.random() * 16777215).toString(16),
            }
        })),
    )
}