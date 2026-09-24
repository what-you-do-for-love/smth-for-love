import { API_HOST } from './api';

export type UploadedImage = {
    url: string;
    fileName: string;
    size: number;
};

/**
 * Raw Cloudinary upload used by endpoints that do not have their own
 * `upload-multiple` route. The BE endpoint must accept `files` (one or more)
 * via multipart/form-data and return [{ url, fileName, size }].
 */
async function postRawFiles(
    url: string,
    files: File[],
): Promise<UploadedImage[]> {
    if (!files || files.length === 0) return [];

    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    const headers: Record<string, string> = {};
    try {
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
        // ignore (SSR / non-browser)
    }

    const resp = await fetch(`${API_HOST}${url}`, {
        method: 'POST',
        body: form,
        headers,
    });

    if (!resp.ok) {
        let message = `HTTP ${resp.status}`;
        try {
            const data = await resp.json();
            message = data.message || message;
        } catch {
            try {
                message = (await resp.text()) || message;
            } catch {
                // ignore
            }
        }
        throw new Error(message);
    }

    return (await resp.json()) as UploadedImage[];
}

/**
 * Used by endpoints that attach uploaded images directly to the parent
 * resource (Cities, Gifts, Avatars). The BE route is the "upload-multiple"
 * companion to the resource's add image endpoint.
 *
 * The BE response shape is `[{ id, imageUrl, dateCreated }]`
 * (or `[{ id, userId, imageUrl, dateCreated, isCurrent }]` for avatars).
 * We pass it through as-is so callers can read the assigned `id` if they wish.
 */
async function postAttachmentFiles(
    url: string,
    files: File[],
    requesterId: number,
    fieldName: 'files' | 'file' = 'files',
): Promise<unknown[]> {
    if (!files || files.length === 0) return [];

    const form = new FormData();
    if (fieldName === 'files') {
        files.forEach((f) => form.append('files', f));
    } else {
        form.append('file', files[0]);
    }

    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${API_HOST}${url}${sep}requesterId=${requesterId}`;

    const headers: Record<string, string> = {};
    try {
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
        // ignore
    }

    const resp = await fetch(fullUrl, {
        method: 'POST',
        body: form,
        headers,
    });

    if (!resp.ok) {
        let message = `HTTP ${resp.status}`;
        try {
            const data = await resp.json();
            message = data.message || message;
        } catch {
            try {
                message = (await resp.text()) || message;
            } catch {
                // ignore
            }
        }
        throw new Error(message);
    }

    return (await resp.json()) as unknown[];
}

export const uploadApi = {
    /**
     * Uploads files via the generic `/api/uploads/images` endpoint. Returns
     * `{ url, fileName, size }` for each file. Callers attach the URLs to
     * their resource through its own `addImage`/`upsert` API.
     *
     * Use this for: anything that doesn't have a dedicated "upload-multiple"
     * BE route. Today that's Memories (CREATE-flow uploads).
     */
    uploadRaw: (files: File[]) => postRawFiles('/api/uploads/images', files),

    /**
     * Attach images directly to a city visit through the BE's dedicated
     * "upload-multiple" route. The BE creates MemoryImage rows server-side
     * and returns them; no extra `addImage` call is needed.
     */
    uploadCityVisitImages: (cityVisitId: number, requesterId: number, files: File[]) =>
        postAttachmentFiles(
            `/api/cities/${cityVisitId}/images/upload-multiple`,
            files,
            requesterId,
            'files',
        ),

    /**
     * Attach images directly to a gift through the BE's dedicated
     * "upload-multiple" route. The BE creates GiftImage rows server-side
     * and returns them; no extra `addImage` call is needed.
     */
    uploadGiftImages: (giftId: number, requesterId: number, files: File[]) =>
        postAttachmentFiles(
            `/api/gifts/${giftId}/images/upload-multiple`,
            files,
            requesterId,
            'files',
        ),

    /**
     * Single-file upload used by the avatar page (the BE accepts a single
     * file under the `file` key and creates a new "current" avatar).
     */
    uploadAvatar: (userId: number, requesterId: number, file: File) =>
        postAttachmentFiles(
            `/api/users/${userId}/avatars/upload`,
            [file],
            requesterId,
            'file',
        ),
};
