
export interface User {
    uid: number;
    id: number;
    name: string;
    email: string;
    password: string;
    apiToken: string;
    rememberToken: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    role: string;
}
