import { Role } from '@prisma/client'
import { Permission } from './permission';

class DefaultRole {
    public admin: Role = {
        id: 'admin',
        name: 'Administrator',
        description: 'Bố mày là admin',
        permissions: Permission.toArray(),
        canAccessBackOffice: true,
    }
    public tester: Role = {
        id: 'tester',
        name: 'Tester',
        description: 'Tester',
        permissions: [...Permission.friend.toArray()],
        canAccessBackOffice: false,
    }
    public normal: Role = {
        id: 'normal',
        name: 'Normal User',
        description: 'Người dùng đã nạp tiền để sử dụng app',
        permissions: [...Permission.friend.toArray()],
        canAccessBackOffice: false,
    }
    public trial: Role = {
        id: 'trial',
        name: 'Trial User',
        description: 'Người dùng mới đăng ký, chưa nạp tiền',
        permissions: [...Permission.friend.toArray()],
        canAccessBackOffice: false,
    }
}

const _ = new DefaultRole();
export { _ as DefaultRole }