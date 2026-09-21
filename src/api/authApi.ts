import { api } from './api';
import {
    LoginResponse,
    ForgotPasswordResponse,
    ChangePasswordRequest,
    RegisterRequest,
} from '../types';

export const authApi = {
    login: async (credentials: { userName: string; password: string }) => {
        return api.post<LoginResponse>('/api/auth/login', credentials);
    },

    register: async (data: RegisterRequest) => {
        return api.post<LoginResponse>('/api/auth/register', data);
    },

    changePassword: async (data: ChangePasswordRequest) => {
        return api.post<{ success: boolean; message: string }>('/api/auth/change-password', data);
    },

    forgotPassword: async (email: string) => {
        return api.post<ForgotPasswordResponse>('/api/auth/forgot-password', { email });
    },

    resetPassword: async (data: Record<string, string>) => {
        return api.post<{ success: boolean; message: string }>('/api/auth/reset-password', data);
    },
};
