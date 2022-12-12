export type Event = {
    id?: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig?: string;
}

export type Reaction = Event & {
    user: User
}

export type Note = Event & {
    reply_id: string | null;
    reactions: Reaction | null;
}

export type User = {
    pubkey: string;
    name: string;
    about: string;
    picture: string;
    content: string;
    refreshed: number;
}

export type Filter = {
    ids?: string[];
    authors?: string[];
    kinds?: number[];
    "#e"?: string[],
    "#p"?: string[];
    since?: number;
    until?: number;
    limit?: number;
}

export type Account = {
    pubkey: string;
    privkey: string;
    name?: string;
    about?: string;
    picture?: string;
}
