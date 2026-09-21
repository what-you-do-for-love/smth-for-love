import { API_HOST } from './api';

export type UploadedImage = {
    url: string;
    fileName: string;
    size: number;
};

/**
 * Upload one or more images to the BE, which forwards them to Cloudinary.
 * Uses `fetch` directly (not `api`) because `api` JSON-serializes the body,
 * but multipart uploads need a plain FormData instance.
 */
export const uploadApi = {
    uploadImages: async (files: File[]): Promise<UploadedImage[]> => {
        if (!files || files.length === 0) return [];

        const form = new FormData();
        // The BE expects the form field name to be "files".
        files.forEach((f) => form.append('files', f));

        const headers: Record<string, string> = {};
        try {
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {
            // ignore
        }
        // DO NOT set Content-Type — the browser will set the multipart boundary.

        const resp = await fetch(`${API_HOST}/api/uploads/images`, {
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
    },

    /**
     * Upload a single image and return the BE's result. Useful when the caller
     * needs per-file progress / per-file failure handling — the BE endpoint
     * accepts one file in the same `files` field, so we just send a single
     * element. Same auth + multipart rules as `uploadImages`.
     */
    uploadImageSingle: async (file: File): Promise<UploadedImage> => {
        const [result] = await uploadApi.uploadImages([file]);
        if (!result) throw new Error('Upload returned no result');
        return result;
    },
};
