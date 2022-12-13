import { get, writable, type Writable } from 'svelte/store'
import { users, addUser } from '../stores/users'
import { notes, updateNotes } from '../stores/notes'
import type { Subscription } from 'nostr-tools'
import { now } from "../util/time"
import { uniq, pluck, difference } from 'ramda'
import type { Event, User, Filter, Note } from './types'
import { pool } from './pool'

export const blacklist: Writable<Array<string>> = writable([
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
])

export const queue: Writable<Array<string>> = writable([])

export const loading: Writable<boolean> = writable(false)

export function listen(since? :number): Subscription {
    const subscriptionId = 'listenToMoi';
    loading.set(true)

    if (!since) {
        since = now()
    }

    let filter: Filter = {
        since: since,
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
        (url: string) => {
            //numRelays
            console.log('EOSE from relay: ', url)
            loading.set(false)
        }
    )

    return subscription
}

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

function handleTextNote(evt: Event, relay: string) {
    let note: Note = evt
    note.relays = [relay]
    updateNotes(note)
}

function handleReaction(evt: Event, relay: string) {
    let note: Note = evt
    note.relays = [relay]
}


export function onEvent(evt: Event, relay: string) {
    switch (evt.kind) {
        case 0:
            console.log(`Received msg ${evt.content}`)
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
        if (foundUser.relays.find((r: string) => r != relay)) {
            foundUser.relays.push(relay)
        }
        foundUser = {
            foundUser,
            ...JSON.parse(evt.content),
            content: evt.content,
            refreshed: now(),
        }
    }
}
