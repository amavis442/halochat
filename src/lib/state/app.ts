import { get, writable, type Writable } from 'svelte/store'
import { users, addUser, formatUser } from '../stores/users'
import { notes } from '../stores/notes'
import type { Subscription } from 'nostr-tools'
import { now } from "../util/time"
import { uniq, pluck, difference, uniqBy } from 'ramda'
import type { Event, User, Filter, Note, Reaction } from './types'
import { pool, channels } from './pool'
import { prop, sort, descend } from "ramda";

export const blacklist: Writable<Array<string>> = writable([
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
])

export const hasEventTag = (tag: Array<string>) => tag[0] === 'e'

export const queue: Writable<Array<string>> = writable([])

export const loading: Writable<boolean> = writable(false)

export function getContacts(): Subscription | null {
    const subscriptionId = Math.random().toString().slice(2);
    let filter: Filter = {
        kinds: [0],
    }
    let $users = get(users)
    let $notes = get(notes)
    //@ts-ignore
    const userPubKeys = uniq(pluck('pubkey', Object.values($users)))
    //@ts-ignore
    const notePubKeys = uniq(pluck('pubkey', Object.values($notes)))

    let pkeys = difference(notePubKeys, userPubKeys)
    if (!pkeys || pkeys.length == 0) {
        loading.set(false)
        return null
    }

    if (pkeys && pkeys.length) {
        filter.authors = pkeys
    }

    const subscription: Subscription = pool.sub(
        //@ts-ignore
        {
            //@ts-ignore
            cb: onEvent,
            filter: filter,
        },
        subscriptionId,
        //@ts-ignore
        () => {
            console.log(`Not gonna close this subscription for getContacts() with subscription id ${subscriptionId}`)
            loading.set(false)
        }
    )
    return subscription
}

function handleMetadata(evt: Event, relay: string) {
    try {
        const content = JSON.parse(evt.content);
        setMetadata(evt, relay, content);
    } catch (err) {
        console.log(evt);
        console.error(err);
    }
}

async function fetchMetaDataUser(pubkey: string, relay: string): Promise<User> {
    let filter: Filter = {
        kinds: [0],
        authors: [pubkey]
    }
    const fetchUsers: Array<Event> = await channels.getter.all(filter)
    if (fetchUsers.length) {
        let formattedUser: User = formatUser(fetchUsers[0], relay)
        addUser(formattedUser)
        return formattedUser
    }

    return null
}

function initNote(note: Note) {
    note.replies = []
    note.downvotes = 0
    note.upvotes = 0
    note.reactions = []
    return note
}

async function handleTextNote(evt: Event, relay: string) {
    let note: Note = evt
    note.relays = [relay]
    let parentNote: Note

    if (!evt.tags.some(hasEventTag)) {
        let user: User
        if (get(users).length) {
            user = get(users).find((u: User) => u.pubkey == evt.pubkey)
        }
        if (!user) {
            user = await fetchMetaDataUser(evt.pubkey, relay)
        }
        parentNote = note
        parentNote.user = user
    }

    if (evt.tags.some(hasEventTag)) {
        let tags = evt.tags.find((item: Array<string>) => item[0] == 'e' && item[3] == 'reply')
        let rootTag = evt.tags.find((item: Array<string>) => item[0] == 'e' && item[3] == 'root')
        if (rootTag) {
            let rootId = rootTag[1]
            if (get(notes).length) {
                parentNote = get(notes).find((n: Note) => n.id == rootId)
            }
        }


        if (tags) {
            let parentEventId: string = tags[1]
            if (!parentNote && get(notes).length) {
                parentNote = get(notes).find((n: Note) => n.id == parentEventId)
            }

            if (typeof parentNote == 'undefined') {
                let filter: Filter = {
                    kinds: [0],
                    '#e': [parentEventId]
                }
                let result: Array<Event> = await channels.getter.all(filter)
                if (result.length) {
                    parentNote = result[0]
                }

                if (typeof parentNote == 'undefined') return
                parentNote = initNote(parentNote)
            }
            if (!parentNote.user) {
                let user: User = get(users).find((u: User) => u.pubkey == parentNote.pubkey)
                parentNote.user = user
            }
            if (parentNote.replies?.length) {
                let user: User
                if (get(users).length) {
                    user = get(users).find((u: User) => u.pubkey == evt.pubkey)
                }
                if (!user) {
                    user = await fetchMetaDataUser(evt.pubkey, relay)
                }
                note.user = user
                parentNote.replies.push(note)
                parentNote.replies = uniqBy(prop('id'), parentNote.replies)
                let byCreatedAt = descend<Note>(prop("created_at"));
                parentNote.replies = sort(byCreatedAt, parentNote.replies);
            } else {
                parentNote.replies = [note]
            }
        }
    }

    if (typeof parentNote !== 'undefined' && parentNote) {
        let byCreatedAt = descend<Note>(prop("created_at"));
        notes.update((data: Array<Note>) => {
            if (!data.length) {
                data = []
            }
            if (data.find(n => n.id == parentNote.id)) {
                return data
            }
            data.unshift(parentNote)
            data = uniqBy(prop('id'), data)
            data = sort(byCreatedAt, data)
            return data
        })
    }
}

function handleReaction(evt: Event, relay: string) {
    let $notes = get(notes)
    if (!$notes || !$notes.length) return

    console.debug('Reaction: ', evt)
    let note: Note = $notes.find((n: Note) => {
        let eIds = evt.tags.filter(t => t[0] == 'e')
        return n.id == eIds[0][1]
    })
    console.log('Reaction found parent node: ', note)

    if (note) {
        let reaction: Reaction = evt
        note.relays = [relay]

        if (note.reactions) {
            if (note.reactions.find(r => r.id == evt.id)) {
                console.debug('Already added this reaction')
                return // Already processed this reaction from another relay. Not gonna count it twice, thrice
            }
        }

        if (note.reactions && !note.reactions.find(r => {
            return r.id == evt.id
        })) {
            note.reactions.push(reaction)
            console.debug('Added reaction', reaction)
        }

        if (!note.reactions) {
            note.reactions = [reaction]
        }

        if (!note.upvotes) note.upvotes = 0
        if (!note.downvotes) note.downvotes = 0

        if (evt.content == '+') note.upvotes = note.upvotes + 1
        if (evt.content == '-') note.downvotes = note.downvotes + 1
    }
    notes.update(data => data) // make sure the view is updated without this, it will not
}

export class Listener {
    filter: Filter
    sub: { unsub: Function }

    constructor(filter: Filter) {
        this.filter = filter
    }

    async start() {
        this.sub = await channels.listener.sub(
            this.filter,
            onEvent,
            (r: string) => { console.log('Eose from ', r) }
        )
    }
    stop() {
        if (this.sub) {
            this.sub.unsub()
        }
    }
}

export function onEvent(evt: Event, relay: string) {
    switch (evt.kind) {
        case 0:
            handleMetadata(evt, relay)
            break
        case 1:
            handleTextNote(evt, relay)
            break
        case 7:
            handleReaction(evt, relay)
            break
        default:
            console.info(`Got an unhandled kind ${evt.kind}`)
    }
}

function setMetadata(evt: Event, relay: string, content: any) {
    const $users = get(users)
    let foundUser: User = $users.find((u: User) => u.pubkey == evt.pubkey)
    if (!foundUser) {
        const regex = new RegExp('(http(s?):)|([/|.|\w|\s])*\.(?:jpg|gif|png)');
        if (!regex.test(content.picture)) {
            content.picture = 'profile-placeholder.png'
        }

        let user: User = {
            pubkey: evt.pubkey,
            name: content.name,
            about: content.about,
            picture: content.picture,
            content: JSON.stringify(content),
            refreshed: now(),
            relays: [relay]
        }
        addUser(user)
    }
    //Update user metadata (foundUser should be a reference, so update should work like this)
    if (foundUser && foundUser.refreshed < (now() - 60 * 10)) {
        if (foundUser.relays && foundUser.relays.length && foundUser.relays.find((r: string) => r != relay)) {
            foundUser.relays.push(relay)
        } else {
            foundUser.relays = [relay]
        }
        foundUser = {
            foundUser,
            ...JSON.parse(evt.content),
            content: evt.content,
            refreshed: now(),
        }
    }
}
