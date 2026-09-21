export type MemoryImage = {
    id: number;
    imageUrl: string;
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

export type CreateMemoryBody = {
    ownerId: number;
    title: string;
    description: string;
    dateHappened: string; // ISO string
    imageUrls?: string[];
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
