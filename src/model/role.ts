import { Role } from '@prisma/client'

class DefaultRole {
    public admin: Role = {
        id: 'admin',
        name: 'Administrator',
        description: 'Bố mày là admin',
        permissions: [],
    }
    public normal: Role = {
        id: 'normal',
        name: 'Normal User',
        description: 'Người dùng đã nạp tiền để sử dụng app',
        permissions: [],
    }
    public trial: Role = {
        id: 'trial',
        name: 'Trial User',
        description: 'Người dùng mới đăng ký, chưa nạp tiền',
        permissions: [],
    }
}

const _ = new DefaultRole();
export { _ as DefaultRole }