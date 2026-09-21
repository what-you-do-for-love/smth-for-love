import { User } from './user';

export type LoginResponse = {
    success: boolean;
    token: string;
    user: User;
    message?: string;
    isSuperAdmin?: boolean;
};

export type ForgotPasswordResponse = {
    success: boolean;
    message: string;
    resetToken?: string;
};

export type ChangePasswordRequest = {
    userId: number;
    currentPassword: string;
    newPassword: string;
};

export type RegisterRequest = {
    userName: string;
    password: string;
    name: string;
    email: string;
};
