import { get, writable, type Writable } from 'svelte/store'
import { users, addUser, formatUser } from '../stores/users'
import { notes } from '../stores/notes'
import type { Subscription } from 'nostr-tools'
import { now } from "../util/time"
import { uniq, pluck, difference, uniqBy, head, count } from 'ramda'
import type { Event, User, Filter, Note, Reaction } from './types'
import { pool, channels } from './pool'
import { prop, sort, descend } from "ramda";
import { setLocalJson, getLocalJson } from '../util/storage'
import { getRootTag, getReplyTag } from '../util/tags';

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

    let unkownUser = {
        pubkey: pubkey,
        name: pubkey,
        about: '',
        picture: 'profile-placeholder.png',
        content: '',
        refreshed: now(),
        relays: [relay]
    }
    addUser(unkownUser)
    return unkownUser
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

function initNote(note: Note) {
    note.replies = []
    note.downvotes = 0
    note.upvotes = 0
    note.reactions = []
    return note
}


async function getNotes(ids: Array<string>, relay: string): Promise<void> {
    let filter: Filter = {
        kinds: [1],
        'ids': ids
    }
    console.debug('getNotes filter ', filter)

    if (!ids.length) return
    let result = await channels.getter.all(filter)
    if (!result) return null // No result to be found :(
    for (let i = 0; i < result.length; i++) {
        let note: Note = result[i] // We get more of the same, depending on the number of relays.
        note = initNote(note)
        let user: User = get(users).find((u: User) => u.pubkey == note.pubkey)
        if (!user) {
            user = await fetchMetaDataUser(note.pubkey, relay)
            addUser(user)
        }
        note.user = user
        noteStack[note.id] = note
    }
}

export const noteStack = writable(getLocalJson('halonostr/notestack') || {})
noteStack.subscribe($stack => {
    setLocalJson('halonostr/notestack', $stack)
})

async function processReplyFeed(evt, replies: Array<Event>, relay: string = ''): Promise<Note | null> {
    let $noteStack = get(noteStack)
    let rootTag = []
    let rootNote: Note

    if (replies.length > 0) {
        let rootNoteId: string = ''

        for (let i = 0; i < replies.length; i++) {
            let reply: Note = replies[i]
            if (!$noteStack[reply.id]) {
                reply = initNote(reply)
                let user: User = get(users).find((u: User) => u.pubkey == reply.pubkey)
                if (!user) {
                    user = await fetchMetaDataUser(reply.pubkey, relay)
                    addUser(user)
                }
                reply.user = user
                $noteStack[reply.id] = reply
            }
            //This is a sticky business some events have a reply tag while it is a root
            // other without markers that tell one with the reply marker is actually the root
            if (!rootTag)
                rootTag = getRootTag(reply.tags)
        }

        rootNote = $noteStack[rootTag[1]]
        if (!rootNote) {
            console.debug(evt.id, ':: No root note for our replies')
            return null
        }
        // get all the events under this eventId
        for (let i = 0; i < replies.length; i++) {
            let e: Note = replies[i]
            let reply = $noteStack[e.id]
            let replyTag = getReplyTag(reply.tags)
            if (!replyTag) continue //No reply tags means we are at the root of ....
            let replyId = replyTag[1]
            if (replyId == rootNoteId) { // level 2
                if (rootNote.replies.find(r => r.id == replyId)) continue
                rootNote.replies.push(reply)

                rootNote.replies = uniqBy(prop('id'), rootNote.replies)

                continue
            }

            let r: Array<Note> = rootNote.replies.filter(r => r.id == replyId) // level 3
            if (r) {
                if (r[0].replies.find(r => r.id == replyId)) continue
                r[0].replies.push(reply)
                r[0].replies = uniqBy(prop('id'), r[0].replies)
                continue
            }

        }
    }
    return rootNote
}


/**
 * fiatjaf
 * 
 * e.g. in the thread
 * A->B->C->D
 * A would have no tags
 * B would have "root" = A
 * C would have "root" = A and "reply" = B
 * D would have "root" = A and "reply" = C
 * 
 * @param evt
 * @param relay 
 * @returns 
 */
async function handleTextNote(evt: Event, relay: string) {
    let note: Note = initNote(evt)
    note.relays = [relay]
    let rootNote: Note
    let $noteStack = get(noteStack)

    if ($noteStack[evt.id]) {
        console.debug(evt.id, ':: Already processed ', evt)
        // already processed
        return
    }

    if (!$noteStack[evt.id]) {
        let user: User = get(users).find((u: User) => u.pubkey == evt.pubkey)
        if (!user) {
            user = await fetchMetaDataUser(note.pubkey, relay)
        }
        note.user = user
        $noteStack[evt.id] = note
    }

    // get all the events under this eventId
    let filter: Filter = {
        kinds: [1],
        '#e': [evt.id]
    }
    console.debug(evt.id, ':: Filter to get replies ', filter)
    let replies: Array<Event> = []
    replies = await channels.getter.all(filter) // This should give all replies.
    console.debug(evt.id, ':: Replies: ', replies)

    if (replies.length) {
        let result: Note | null = await processReplyFeed(evt, replies, relay)
        if (!result) {
            console.log(evt.id, ':: No root note')
        }
        rootNote = result
    }

    // This will always be the root Note. Level 1
    if (!evt.tags.some(hasEventTag)) {
        let user: User
        if (get(users).length) {
            user = get(users).find((u: User) => u.pubkey == evt.pubkey)
        }
        if (!user) {
            user = await fetchMetaDataUser(evt.pubkey, relay)
        }
        rootNote = note
        rootNote = initNote(rootNote)
        rootNote.user = user
    }

    let numETags = count(t => t[0] == 'e', evt.tags)

    if (numETags) {
        let rootTag = getRootTag(evt.tags)
        let replyTag = getReplyTag(evt.tags)
        console.debug(evt.id, ':: Content: [', evt.content, ']\n Root: ', rootTag, 'Reply: ', replyTag)

        if (replies.length == 0) {
            // We asume that there has not been any replies on this one so the reply Id will be the root 
            let rootNoteId = rootTag[1]
            console.debug(evt.id, ':: No replies, root id:', rootNoteId)
            rootNote = $noteStack[rootNoteId]
            console.debug(evt.id, ':: Check the rootNote ', rootNote)
            console.debug(evt.id, ':: Stack ', $noteStack)
            
            if (!rootNote) {
                await getNotes([rootNoteId], relay)
                rootNote = $noteStack[rootNoteId] // Try again
                if (!rootNote) return // We give up
            }
            // a -> b
            if (rootTag[1] == replyTag[1]) {
                rootNote.replies.push($noteStack[note.id])
                rootNote.replies = uniqBy(prop('id'), rootNote.replies)

                console.debug(evt.id, ':: No replies, so this will be the first and the tag event id will be the root:', rootNote)
            }
            // a -> b -> c
            if (rootTag[1] != replyTag[1]) {
                let c = rootNote.replies.find(n => n.id == replyTag[1])
                c.replies.push($noteStack[note.id])
                c.replies = uniqBy(prop('id'), c.replies)
                console.debug(evt.id, ':: No replies, but reply id != root id so reply id is likely a child of root. child of root:', c)
            }
        }
    }

    console.debug('Current stack: ', $noteStack)

    if (typeof rootNote !== 'undefined' && rootNote) {
        console.debug(evt.id, ':: Add/update a note: ', rootNote)
        let byCreatedAt = descend<Note>(prop("created_at"));
        notes.update((data: Array<Note>) => {
            if (!data.length) {
                data = []
            }
            let note: Note = data.find(n => n.id == rootNote.id)
            if (note) {
                note = rootNote //replace it with updated data
                console.debug(evt.id, ':: Updated note ', note)
                return data
            }
            data.unshift(rootNote)
            data = uniqBy(prop('id'), data)
            data = sort(byCreatedAt, data)
            return data
        })
    }
}

function handleReaction(evt: Event, relay: string) {
    let $notes = get(notes)
    if (!$notes || !$notes.length) return
    let rootTag = getRootTag(evt.tags)
    let replyTag = getReplyTag(evt.tags)

    const eventTags = evt.tags.filter(hasEventTag);
    let replies = eventTags.filter((e) => e[3] ? e[3] === 'reply' : false);
    if (replies.length == 0) {
        replies = eventTags.filter((tags) => tags[3] === undefined);
    }

    if (replies.length != 1) {
        console.debug(evt.id, ':: Reaction Old style or no reply tag')
        return
    }
    const eventId: string = replies[0][1];

    console.debug(evt.id, ':: Reaction: ', eventId)

    let note: Note
    let result = $notes.filter((n: Note) => n.id == eventId)
    if (result.length) {
        note = result[0]
        console.debug(evt.id, ':: Reaction Root ', note)
    }

    if (!result.length) {
        console.debug(evt.id, ':: Reaction Is not root ;)')
        for (let i = 0; i < $notes.length; i++) {
            let rootNote: Note = $notes[i]
            result = rootNote.replies.filter((n: Note) => n.id == eventId)
            if (result.length) {
                note = result[0]
                break
            }
        }
        console.debug(evt.id, ':: Reaction Is not root ;)')
    }

    if (!note && rootTag) {
        let rootNote = $notes.find((n: Note) => n.id == rootTag[1])
        if (rootNote.id == replyTag[1]) note = rootNote

        let replies: Array<Note> = Object.values(rootNote.replies)
        let v = replies.find(n => n.id == replyTag[1])
        if (v) {
            console.debug(evt.id, " :: Reaction replies ", v)
            note = v
        }

        if (!note) {
            for (let index in replies) {
                if (replies[index].replies) {
                    let n = replies[index].replies.find(n => n.id == replyTag[1])
                    if (n) {
                        note = n
                        console.debug(evt.id, " :: Reaction  replies of the replies", n)
                        break
                    }
                }
            }
        }

        console.debug('---------', rootTag, evt.tags)
    }
    console.debug(evt.id, ':: Reaction found node: ', note)

    if (note) {
        let reaction: Reaction = evt
        note.relays = [relay]

        if (note.reactions) {
            if (note.reactions.find(r => r.id == evt.id)) {
                console.debug(evt.id, ':: Reaction Already added this reaction')
                return // Already processed this reaction from another relay. Not gonna count it twice, thrice
            }
        }

        if (note.reactions && !note.reactions.find(r => {
            return r.id == evt.id
        })) {
            note.reactions.push(reaction)
            console.debug(evt.id, ':: Reaction Added reaction', reaction)
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


