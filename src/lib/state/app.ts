import { get, writable } from 'svelte/store'
import { users } from '../stores/user'
import { notes, updateNotes } from '../stores/notes'

import { now } from "../util/time"
import { uniqBy, prop, pluck, sortBy, last } from 'ramda'
import type { Event, User, Filter, Note, Reply } from './types'
import { eventdata } from '../stores/eventdata'
import { pool } from './pool'

export const blacklist = writable([
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
])

async function sendRequest(filter:Filter){
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

export let userData: Array<Event> = []
export let noteData: Array<Event> = []
export let replyData: Array<Event> = []
export let reactionData: Array<Event> = []
export let deleteData: Array<Event> = []
export let allData: Array<Event> = []
export let lastTimeStamp: number = now()
export let firstTimeStamp: number = now()


export async function listen(limit: number = 250): Promise<any> {
    const subscriptionId = Math.random().toString().slice(2);

    // Get some events from 7 days with a max limit of 4000 records
    let filter: Filter = {
        kinds: [0, 1, 5, 7],
        until: now(),
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
        () => {}
    )

    console.log(subscription)
}


function handleMetadata(evt, relay) {

}

function handleTextNote(evt:Event , relay:string) {
    let $notes = get(notes)
    let data = {}
    if (!$notes[evt.id]) {
        data[evt.id] = evt
        console.log(data)
        updateNotes(data)   
    }
}

function handleReaction(evt, relay) { }


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
                        userData.push(note)
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
                        noteData.push(note)
                        break;
                    case 5: //deletion request
                        /**
                         * @see https://github.com/nostr-protocol/nips/blob/master/09.md
                         */
                        deleteData.push(note)
                        break
                    case 7:  //reactions likes/dislikes. upvote/downvote (+,-)
                        /**
                         * @see https://github.com/nostr-protocol/nips/blob/master/25.md
                         */
                        reactionData.push(note)
                        break
                }
            }
            allData.push(note)
        })

        if (userData.length) {
            userData = uniqBy(prop('id'), userData)
        }
        if (noteData.length) {
            noteData = uniqBy(prop('id'), noteData)
        }
        if (replyData.length) {
            replyData = uniqBy(prop('id'), replyData)
        }
        if (reactionData.length) {
            reactionData = uniqBy(prop('id'), reactionData)
        }
        if (deleteData.length) {
            deleteData = uniqBy(prop('id'), deleteData)
        }
        if (allData.length) {
            allData = sortBy(prop('created_at'), uniqBy(prop('id'), allData)) // Many relays with same data,so dedupe it
            lastTimeStamp = allData[0].created_at
            firstTimeStamp = last(allData).created_at
        }

        eventdata.set(allData)

        myNotes = uniqBy(prop('id'), myNotes)
        resolve(myNotes)
    })
}
