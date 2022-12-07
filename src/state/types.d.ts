export type Event = {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
}

export type Reply = Event & {
    user: User;
}

export type Reaction = Event & {
    user: User
}

export type Note = Event & {
    user: User;
    replies: Reply | null;
    reactions: Reaction| null;
}

export type User = {
    pubkey: string;
    name: string;
    about: string;
    picture: string;
    content: string;
    refreshed: string;
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