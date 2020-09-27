interface IPermission {
    toArray(): string[];
}

class PermissionByModule implements IPermission {
    private _name: string;

    constructor(name: string) {
        this._name = name;
    }

    get list(): string {
        return this._name + '.list';
    }

    get create(): string {
        return this._name + '.create';
    }

    get update(): string {
        return this._name + '.update';
    }

    get delete(): string {
        return this._name + '.delete';
    }

    get import(): string {
        return this._name + '.import';
    }

    get export(): string {
        return this._name + '.export';
    }

    public toArray() {
        return [this.list, this.create, this.update, this.delete, this.import, this.export];
    }
}

class FriendPermission implements IPermission {
    get create(): string {
        return 'friend' + '.create';
    }

    get delete(): string {
        return 'friend' + '.delete';
    }

    toArray(): string[] {
        return [this.create, this.delete];
    };
}

const permission = {
    config: new PermissionByModule('config'),
    user: new PermissionByModule('user'),
    role: new PermissionByModule('role'),
    post: new PermissionByModule('post'),
    friend: new FriendPermission(),
    toArray: (): string[] => {
        let array: string[] = [];
        Object.values(permission).forEach((value) => {
            if ('toArray' in value) {
                array.push(...value.toArray());
            }
        });
 
        return array;
    }
};

export { permission as Permission };