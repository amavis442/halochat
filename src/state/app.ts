import { get, writable } from 'svelte/store'
import { getData } from '../state/pool'
import { users } from '../stores/user'
import { now } from "../util/time"
import { uniqBy, prop, pluck } from 'ramda'
import type { Event, User, Filter, Note, Reply } from './types'

export const blacklist = writable([
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
])

export async function initData(limit: number = 10): Promise<any> {
    // Get some events from 7 days with a max limit of 4000 records
    let filter: Filter = {
        kinds: [1],
        until: now(), // Events from 2 days
        limit: limit, // Start of with 20 events and get more when needed (scrolling).
    };
    return getData(filter)
}

/**
 * Retrieves all pubkey from the event(s) and tries to get the user meta data for this event
 * @param data
 */
export async function updateUserData(data: Array<any>) {
    let pubKeys = []
    data.forEach((event: any) => {
        pubKeys.push(event.pubkey.toString());
    })

    const $users = get(users)
    pubKeys = pubKeys.filter(k => !$users[k]) // filter out the ones we already have
    if (pubKeys.length) {
        let filter = {
            kinds: [0],
            authors: pubKeys,
        };
        const userData = await getData(filter)

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
        replyData = await getData(filter)
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

/**
 * Put note,user,replies and likes/dislikes together
 * 
 * For reactions @see https://github.com/nostr-protocol/nips/blob/master/25.md
 * 
 * @param event
 */
export async function processEvent(event: any): Promise<Array<Note>> {
    if (!Array.isArray(event)) {
        event = [event]
    }
    const $users = get(users)
    const $blacklist = get(blacklist)

    await updateUserData(event)
    const reply = await replies(event)
    if (reply.raw.length) {
        await updateUserData(reply.raw)
    }

    return new Promise((resolve, reject) => {
        let myNotes = []
        //merge user with their events
        event.forEach((note: Event) => {
            if (!$blacklist.includes(note.pubkey)) {
                let myNote: Note
                switch (note.kind) {
                    case 0: //User meta data
                        /**
                         * @see https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
                         */
                        break;
                    case 1:
                        /**
                         * @see https://github.com/nostr-protocol/nips/blob/master/01.md#events-and-signatures
                         */
                        let thisReply: Reply | null = null
                        if (reply.json[note.id]) {
                            thisReply = {
                                ...reply.json[note.id],
                                user: $users[reply.json[note.id].pubkey]
                            }
                        }
                        myNote = {
                            ...note,
                            user: $users[note.pubkey],
                            replies: thisReply,
                            reactions: null
                        }
                        myNotes.push(myNote)
                        break;
                    case 5: //deletion request
                        /**
                         * @see https://github.com/nostr-protocol/nips/blob/master/09.md
                         */
                        myNote = {
                            ...note,
                            user: $users[note.pubkey],
                            replies: null,
                            reactions: null
                        }
                        myNotes.push(myNote)
                        break
                    case 7:  //reactions likes/dislikes. upvote/downvote (+,-)
                        /**
                         * @see https://github.com/nostr-protocol/nips/blob/master/25.md
                         */
                        myNote = {
                            ...note,
                            user: $users[note.pubkey],
                            replies: null,
                            reactions: null
                        }
                        myNotes.push(myNote)
                        break
                }
            }
        })
        resolve(myNotes)
    })
}
