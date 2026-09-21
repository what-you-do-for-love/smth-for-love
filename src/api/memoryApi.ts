import { api } from './api';
import {
    Memory,
    CreateMemoryBody,
    UpdateMemoryBody,
    MemoryImage,
    MemoryNote,
    AddMemoryImageBody,
    AddMemoryNoteBody,
} from '../types';

export const memoryApi = {
    /**
     * All memories visible to a user (theirs + their partner's).
     */
    getForUser: async (userId: number): Promise<Memory[]> => {
        return api.get<Memory[]>(`/api/memories/user/${userId}`);
    },

    /**
     * Single memory with full details (images + notes).
     */
    getById: async (id: number, requesterId: number): Promise<Memory> => {
        return api.get<Memory>(`/api/memories/${id}?requesterId=${requesterId}`);
    },

    /**
     * Create a new memory. Optionally seed it with image URLs.
     */
    create: async (body: CreateMemoryBody): Promise<Memory> => {
        return api.post<Memory>('/api/memories', body);
    },

    /**
     * Edit a memory (owner only).
     */
    update: async (id: number, body: UpdateMemoryBody): Promise<Memory> => {
        return api.put<Memory>(`/api/memories/${id}`, body);
    },

    /**
     * Delete a memory (owner only).
     */
    remove: async (id: number, requesterId: number): Promise<void> => {
        return api.delete<void>(`/api/memories/${id}?requesterId=${requesterId}`);
    },

    // ---- Images ----

    addImage: async (
        memoryId: number,
        requesterId: number,
        body: AddMemoryImageBody,
    ): Promise<MemoryImage> => {
        return api.post<MemoryImage>(
            `/api/memories/${memoryId}/images?requesterId=${requesterId}`,
            body,
        );
    },

    removeImage: async (
        memoryId: number,
        imageId: number,
        requesterId: number,
    ): Promise<void> => {
        return api.delete<void>(
            `/api/memories/${memoryId}/images/${imageId}?requesterId=${requesterId}`,
        );
    },

    // ---- Notes ----

    addNote: async (memoryId: number, body: AddMemoryNoteBody): Promise<MemoryNote> => {
        return api.post<MemoryNote>(`/api/memories/${memoryId}/notes`, body);
    },

    removeNote: async (noteId: number, requesterId: number): Promise<void> => {
        return api.delete<void>(`/api/memories/notes/${noteId}?requesterId=${requesterId}`);
    },
};
