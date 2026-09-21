export type User = {
    id: number;
    userName: string;
    name: string;
    email: string;
    role: string;
    department: string;
    loveCode: string;
    partnerId: number | null;
};

// ---- Partner (what you see of your partner) ----
export type Partner = {
    id: number;
    userName: string;
    name: string;
    email: string;
    loveCode: string;
};

// ---- Relationship ----
export type Relationship = {
    id: number;
    user1Id: number;
    user2Id: number;
    status: string;
    createdDate: string;
    acceptedDate: string | null;
    user1: User | null;
    user2: User | null;
};

// ---- My Relationship (what a user sees of their own relationship) ----
export type MyRelationship = {
    relationshipId: number;
    status: string;
    createdDate: string;
    acceptedDate: string | null;
    partner: Partner | null;
};

// ---- Requests ----
export type SendRequestBody = {
    senderId: number;
    receiverId: number;
};

export type RespondRequestBody = {
    responderId: number;
    accept: boolean;
};
