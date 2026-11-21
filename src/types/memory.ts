export type MemoryMediaType = 'image' | 'video';

export type MemoryImage = {
    id: number;
    imageUrl: string;
    mediaType: MemoryMediaType;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
    dateCreated: string;
};

export type MemoryNote = {
    id: number;
    content: string;
    dateCreated: string;
    senderId: number;
    senderName: string | null;
};

export type Memory = {
    id: number;
    title: string;
    description: string;
    dateHappened: string;
    dateCreated: string;
    ownerId: number;
    ownerName: string | null;
    images: MemoryImage[];
    notes: MemoryNote[];
};

// ---- Request bodies ----

export type MemoryMediaInput = {
    url: string;
    mediaType: MemoryMediaType;
    thumbnailUrl?: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
};

export type CreateMemoryBody = {
    ownerId: number;
    title: string;
    description: string;
    dateHappened: string; // ISO string
    imageUrls?: string[];
    media?: MemoryMediaInput[];
};

export type UpdateMemoryBody = {
    requesterId: number;
    title?: string;
    description?: string;
    dateHappened?: string;
};

export type AddMemoryNoteBody = {
    senderId: number;
    content: string;
};

export type AddMemoryImageBody = {
    imageUrl: string;
};