export interface IToArrayable {
    toArray(): string[];
}

export abstract class ByModule {
    public abstract toArray(): string[];
    public validate(values: string[]): string[] {
        const result: string[] = [];
        const allValue = this.toArray();
        values.forEach(e => {
            if (!allValue.includes(e)) {
                result.push(e);
            }
        })
        return result;
    }
}

enum PermissionEnum { list, create, update, delete, import, export }

class PermissionByModule implements IToArrayable {
    protected _name: string;

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

    get name(): string {
        return this._name;
    }

    public toArray() {
        return [this.list, this.create, this.update, this.delete, this.import, this.export];
    }
}

class FriendPermission extends PermissionByModule {
    constructor() {
        super('friend')
    }
    toArray(): string[] {
        return [this.create, this.delete];
    };
}

class ChatPermission extends PermissionByModule {
    constructor() {
        super('chat')
    }
    toArray(): string[] {
        return [this.create];
    };
}

class Permission extends ByModule {
    public config = new PermissionByModule('config');
    public user = new PermissionByModule('user');
    public role = new PermissionByModule('role');
    public hobby = new PermissionByModule('hobby');
    public question = new PermissionByModule('question');
    public qnA = new PermissionByModule('qnA');
    public post = new PermissionByModule('post');
    public comment = new PermissionByModule('comment');
    public postCategory = new PermissionByModule('postCategory');
    public friend = new FriendPermission();
    public chat = new ChatPermission();

    public toArray(): string[] {
        let array: string[] = [];
        Object.values(this).forEach((value) => {
            if (typeof value === 'object' && 'toArray' in value) {
                array.push(...value.toArray());
            }
        });

        return array;
    }
};

const permission = new Permission();

export { permission as Permission };