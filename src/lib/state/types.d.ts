import type { Event, Filter } from 'nostr-tools'

export type Reaction = Event & {
    user?: User
}

export type Filter = Filter & {limit:number}

export type TextNote = Event & {
    reply_id?: string;
    replies?: Array<Note>;
    reactions?: Array<Reaction>;
    upvotes?: number;
    downvotes?: number;
    relays?: Array<string>;
    user?: User;
    tree?: number;
    dirty?: boolean;
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
    added?: number;
    user?: User | null;
}

export type Account = {
    pubkey: string;
    privkey: string;
    name?: string;
    about?: string;
    picture?: string;
}
