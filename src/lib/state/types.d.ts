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
    user?: User
}

export type Note = Event & {
    reply_id?: string;
    replies?: Array<Note>;
    reactions?: Array<Reaction>;
    upvotes?: number;
    downvotes?: number;
    relays?: Array<string>;
    user?: User;
}

export type User = {
    pubkey: string;
    name: string;
    about: string;
    picture: string;
    content: string;
    refreshed: number;
    relays?: Array<string>
}

export type Follow = {
    pubkey: string;
    petname: string;
    added: number;
    user: User | null;
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
