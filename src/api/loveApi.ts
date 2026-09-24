import { api } from './api';
import {
    Anniversary,
    UpsertAnniversaryBody,
    CityVisit,
    CityVisitImage,
    CreateCityVisitBody,
    UpdateCityVisitBody,
    Gift,
    GiftImage,
    CreateGiftBody,
    UpdateGiftBody,
    UserAvatar,
} from '../types';

export const anniversaryApi = {
    getForUser: async (userId: number): Promise<Anniversary | null> => {
        try {
            return await api.get<Anniversary>(`/api/anniversaries/user/${userId}`);
        } catch (err: unknown) {
            // 404 means "no anniversary yet" — that's a normal state, not an error.
            if (err instanceof Error && /404|Not Found/i.test(err.message)) return null;
            throw err;
        }
    },
    upsert: (body: UpsertAnniversaryBody) =>
        api.put<Anniversary>('/api/anniversaries', body),
    remove: (requesterId: number) =>
        api.delete<void>(`/api/anniversaries?requesterId=${requesterId}`),
};

export const cityVisitApi = {
    getForUser: (userId: number) => api.get<CityVisit[]>(`/api/cities/user/${userId}`),
    getById: (id: number, requesterId: number) =>
        api.get<CityVisit>(`/api/cities/${id}?requesterId=${requesterId}`),
    create: (body: CreateCityVisitBody) => api.post<CityVisit>('/api/cities', body),
    update: (id: number, body: UpdateCityVisitBody) =>
        api.put<CityVisit>(`/api/cities/${id}`, body),
    remove: (id: number, requesterId: number) =>
        api.delete<void>(`/api/cities/${id}?requesterId=${requesterId}`),
    addImage: (id: number, requesterId: number, body: { imageUrl: string }) =>
        api.post<CityVisitImage>(
            `/api/cities/${id}/images?requesterId=${requesterId}`,
            body,
        ),
    removeImage: (id: number, imageId: number, requesterId: number) =>
        api.delete<void>(
            `/api/cities/${id}/images/${imageId}?requesterId=${requesterId}`,
        ),
};

export const giftApi = {
    getForUser: (userId: number) => api.get<Gift[]>(`/api/gifts/user/${userId}`),
    getById: (id: number, requesterId: number) =>
        api.get<Gift>(`/api/gifts/${id}?requesterId=${requesterId}`),
    create: (body: CreateGiftBody) => api.post<Gift>('/api/gifts', body),
    update: (id: number, body: UpdateGiftBody) =>
        api.put<Gift>(`/api/gifts/${id}`, body),
    remove: (id: number, requesterId: number) =>
        api.delete<void>(`/api/gifts/${id}?requesterId=${requesterId}`),
    addImage: (id: number, requesterId: number, body: { imageUrl: string }) =>
        api.post<GiftImage>(
            `/api/gifts/${id}/images?requesterId=${requesterId}`,
            body,
        ),
    removeImage: (id: number, imageId: number, requesterId: number) =>
        api.delete<void>(
            `/api/gifts/${id}/images/${imageId}?requesterId=${requesterId}`,
        ),
};

export const userAvatarApi = {
    getForUser: (userId: number) =>
        api.get<UserAvatar[]>(`/api/users/${userId}/avatars`),
    getCurrent: (userId: number) =>
        api.get<UserAvatar>(`/api/users/${userId}/avatars/current`),
    setCurrent: (userId: number, avatarId: number, requesterId: number) =>
        api.put<UserAvatar>(
            `/api/users/${userId}/avatars/${avatarId}/current?requesterId=${requesterId}`,
            {},
        ),
    remove: (userId: number, avatarId: number, requesterId: number) =>
        api.delete<void>(
            `/api/users/${userId}/avatars/${avatarId}?requesterId=${requesterId}`,
        ),
};
