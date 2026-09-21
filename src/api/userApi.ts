import { api } from './api';
import { User } from '../types';

export const userApi = {
    getAll: async () => {
        return api.get<User[]>('/api/users');
    },

    getById: async (id: number) => {
        return api.get<User>(`/api/users/${id}`);
    },

    getByUsername: async (userName: string) => {
        return api.get<User>(`/api/users/by-username/${encodeURIComponent(userName)}`);
    },

    create: async (data: {
        userName: string;
        name: string;
        email: string;
        password: string;
        role?: string;
        department?: string;
    }) => {
        return api.post<User>('/api/users', data);
    },

    delete: async (id: number) => {
        return api.delete<void>(`/api/users/${id}`);
    },
};
