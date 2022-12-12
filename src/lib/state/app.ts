import { get, writable } from 'svelte/store'
import { users, addUser } from '../stores/users'
import { notes, updateNotes, noteReplyPubKeys } from '../stores/notes'

import { now } from "../util/time"
import { uniqBy, uniq, prop, pluck, difference } from 'ramda'
import type { Event, User, Filter } from './types'
import { pool } from './pool'

export const blacklist = writable([
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
])

export const queue = writable([])

async function sendRequest(filter: Filter) {
    return []
}
/**
 * Retrieves all pubkey from the event(s) and tries to get the user meta data for this event
 * @param data
 */
export async function updateUserData(data: Array<any>) {
    let pubKeys = []
    data.forEach((event: any) => {
        try {
            pubKeys.push(event.pubkey.toString());
        } catch (error) {
            console.log('Error getting userdata', event)
        }
    })

    const $users = get(users)
    pubKeys = pubKeys.filter(k => !$users[k] || $users[k].refreshed < now() - (60 * 60 * 10)) // filter out the ones we already have
    if (pubKeys.length) {
        let filter = {
            kinds: [0],
            authors: pubKeys,
        };
        const userData = await sendRequest(filter)

        /**
         * Add metadata to user and tries to update the data in localstore
         * $users = writable = observable
         */
        users.update($users => {
            userData.forEach((e) => {
                const user: User = {
                    pubkey: e.pubkey,
                    ...$users[e.pubkey],
                    ...JSON.parse(e.content),
                    content: e.content,
                    refreshed: now()
                }
                $users[e.pubkey] = user
                const regex = new RegExp('(http(s?):)|([/|.|\w|\s])*\.(?:jpg|gif|png)');
                if (!regex.test($users[e.pubkey].picture)) {
                    $users[e.pubkey].picture = 'profile-placeholder.png'
                }
            })
            return $users
        })
    }
}

function findReplies(data: Event[]) {
    let replies = []
    data.forEach((event: Event) => {
        if (event.tags) {
            event.tags.forEach((tag) => {
                if (tag[0] == "e" && tag[1] && (tag[3] == "reply")) {
                    replies.push({ id: event.id, reply: tag[1] })
                }
            })
        }
    })
    return replies
}

/**
 * Get the replies
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/10.md#marked-e-tags-preferred
 * @param data 
 * @returns 
 */
export async function replies(data: Array<Event>) {
    let replies = []

    const r = findReplies(data)
    replies = uniqBy(prop('id'), r)

    const d = []
    let replyData = []
    if (replies.length > 0) {
        const eventId = pluck('reply', replies)
        const filter: Filter = {
            kinds: [1],
            '#e': eventId,
        }
        replyData = await sendRequest(filter)
        replyData = uniqBy(prop('id'), replyData)

        replyData.forEach((element) => {
            const eId = replies.filter((a) => { return element.id == a.reply })
            if (eId.length) {
                d[eId[0].id] = element
            }
        })
    }
    return { json: d, raw: replyData }
}

export const loading = writable(false)
export async function listen(limit: number = 250): Promise<any> {
    const subscriptionId = 'listenToMoi';
    loading.set(true)
    // Get some events from 7 days with a max limit of 4000 records
    let filter: Filter = {
        //kinds: [0, 1, 5, 7],
        //until: now(),
        limit: limit,
    }

    const subscription = pool.sub(
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

export async function getContacts(): Promise<any> {
    const subscriptionId = Math.random().toString().slice(2);
    let filter: Filter = {
        kinds: [0],
    }
    let $users = get(users)
    let $notes = get(notes)
    //@ts-ignore
    const userPubKeys = uniq(pluck('pubkey', Object.values($users)))
    const notePubKeys = uniq(pluck('pubkey', Object.values($notes)))

    let pkeys = difference(notePubKeys, userPubKeys)
    if (!pkeys || pkeys.length == 0) {
        loading.set(false)
        return 0
    }

    if (pkeys && pkeys.length) {
        filter.authors = pkeys
    }

    const subscription = pool.sub(
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


function handleMetadata(evt, relay) {
    try {
        const content = JSON.parse(evt.content);
        setMetadata(evt, relay, content);
    } catch (err) {
        console.log(evt);
        console.error(err);
    }
}

function handleTextNote(evt: Event, relay: string) {
    //@ts-ignore
    updateNotes(evt)
}

function handleReaction(evt, relay) { }


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
    if (!$users[evt.pubkey]) {
        let user: User = {
            pubkey: evt.pubkey,
            name: content.name,
            about: content.about,
            picture: content.picture,
            content: JSON.stringify(content),
            refreshed: now()
        }
        addUser(user)
    }
}
