// ===== Anniversary =====
export type Anniversary = {
    id: number;
    coupleKey: number;
    loveStartDate: string;
    weddingDate: string | null;
    imageUrl: string | null;
    description: string | null;
    userANote: string | null;
    userBNote: string | null;
    dateCreated: string;
    dateUpdated: string;
    daysTogether: number;
    daysUntilNextLoveAnniversary: number;
    daysUntilNextWeddingAnniversary: number | null;
};

export type UpsertAnniversaryBody = {
    requesterId: number;
    loveStartDate: string;
    weddingDate: string | null;
    imageUrl?: string | null;
    description?: string | null;
    userANote?: string | null;
    userBNote?: string | null;
};

// ===== CityVisit =====
export type CityVisitImage = {
    id: number;
    imageUrl: string;
    dateCreated: string;
};

export type CityVisit = {
    id: number;
    ownerId: number;
    ownerName: string | null;
    name: string;
    country: string;
    dateVisited: string;
    rating: number;
    latitude: number | null;
    longitude: number | null;
    highlights: string | null;
    isFavorite: boolean;
    dateCreated: string;
    images: CityVisitImage[];
};

export type CreateCityVisitBody = {
    ownerId: number;
    name: string;
    country: string;
    dateVisited: string;
    rating: number;
    latitude?: number | null;
    longitude?: number | null;
    highlights?: string | null;
    isFavorite: boolean;
    imageUrls?: string[];
};

export type UpdateCityVisitBody = {
    requesterId: number;
    name?: string;
    country?: string;
    dateVisited?: string;
    rating?: number;
    latitude?: number | null;
    longitude?: number | null;
    highlights?: string | null;
    isFavorite?: boolean;
};

// ===== Gift =====
export type GiftImage = {
    id: number;
    imageUrl: string;
    dateCreated: string;
};

export type Gift = {
    id: number;
    ownerId: number;
    ownerName: string | null;
    name: string;
    description: string | null;
    dateReceived: string;
    occasion: string;
    giverUserId: number;
    giverName: string | null;
    dateCreated: string;
    images: GiftImage[];
};

export const GIFT_OCCASIONS = [
    'Birthday',
    'Anniversary',
    'Christmas',
    'Valentine',
    'JustBecause',
    'Other',
] as const;
export type GiftOccasion = (typeof GIFT_OCCASIONS)[number];

export type CreateGiftBody = {
    ownerId: number;
    name: string;
    description?: string | null;
    dateReceived: string;
    occasion: string;
    giverUserId: number;
    imageUrls?: string[];
};

export type UpdateGiftBody = {
    requesterId: number;
    name?: string;
    description?: string | null;
    dateReceived?: string;
    occasion?: string;
    giverUserId?: number;
};

// ===== Avatar =====
export type UserAvatar = {
    id: number;
    userId: number;
    imageUrl: string;
    dateCreated: string;
    isCurrent: boolean;
};

export type UserSummary = {
    id: number;
    userName: string;
    name: string;
    email: string | null;
    role: string;
    department: string | null;
    loveCode: string;
    currentAvatarUrl: string | null;
    partnerId: number | null;
    partnerName: string | null;
};
