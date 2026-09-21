import { api } from './api';
import { User, MyRelationship, Relationship, SendRequestBody, RespondRequestBody } from '../types';

export const relationshipApi = {
    /**
     * Get the current user's relationship (partner info or null).
     */
    getMyRelationship: async (userId: number): Promise<MyRelationship> => {
        return api.get<MyRelationship>(`/api/relationships/me/${userId}`);
    },

    /**
     * Get pending incoming relationship requests for a user.
     */
    getPendingRequests: async (userId: number): Promise<Relationship[]> => {
        return api.get<Relationship[]>(`/api/relationships/pending/${userId}`);
    },

    /**
     * Send a relationship request to another user.
     */
    sendRequest: async (body: SendRequestBody): Promise<Relationship> => {
        return api.post<Relationship>('/api/relationships/send', body);
    },

    /**
     * Accept or reject a pending relationship request.
     */
    respondToRequest: async (relationshipId: number, body: RespondRequestBody): Promise<Relationship> => {
        return api.post<Relationship>(`/api/relationships/${relationshipId}/respond`, body);
    },

    /**
     * Look up a user by their 6-character love code.
     */
    getByLoveCode: async (code: string): Promise<User> => {
        return api.get<User>(`/api/relationships/love-code/${encodeURIComponent(code.toUpperCase())}`);
    },
};
