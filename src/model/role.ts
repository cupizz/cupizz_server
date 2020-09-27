import { Role } from '@prisma/client'
import { Permission } from './permission';

class DefaultRole {
    public admin: Role = {
        id: 'admin',
        name: 'Administrator',
        description: 'Bố mày là admin',
        permissions: Permission.toArray(),
    }
    public normal: Role = {
        id: 'normal',
        name: 'Normal User',
        description: 'Người dùng đã nạp tiền để sử dụng app',
        permissions: [...Permission.friend.toArray()],
    }
    public trial: Role = {
        id: 'trial',
        name: 'Trial User',
        description: 'Người dùng mới đăng ký, chưa nạp tiền',
        permissions: [...Permission.friend.toArray()],
    }
}

const _ = new DefaultRole();
export { _ as DefaultRole }