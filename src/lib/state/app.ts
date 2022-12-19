import { get, writable, type Writable } from 'svelte/store'
import { users, annotateUsers, formatUser } from '../stores/users'
import { notes } from '../stores/notes'
import type { Subscription } from 'nostr-tools'
import { now } from "../util/time"
import { uniq, pluck, difference, uniqBy } from 'ramda'
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
        setMetadata(evt, relay);
    } catch (err) {
        console.log(evt);
        console.error(err);
    }
}

/**
 * Get user metadata from a relay
 * 
 * @param pubkey string
 * @param relay string
 * @returns 
 */
async function fetchMetaDataUser(note: Note, relay: string): Promise<void> {
    let filter: Filter = {
        kinds: [0],
        authors: [note.pubkey]
    }
    return channels.getter.all(filter)
        .then((fetchResultUsers: Array<Event>) => {
            let user: User
            if (fetchResultUsers.length) {
                user = formatUser(fetchResultUsers[0], relay)
            }
            if (fetchResultUsers.length == 0 || !fetchMetaDataUser) {
                let unkownUser = {
                    pubkey: note.pubkey,
                    name: note.pubkey,
                    about: '',
                    picture: 'profile-placeholder.png',
                    content: '',
                    refreshed: now(),
                    relays: [relay]
                }
                user = unkownUser
            }
            annotateUsers(user)
            note.user = user
        });
}

/**
 * 
 * @param evt Event
 * @param relay string
 * @param content string
 */
function setMetadata(evt: Event, relay: string) {
    const $users = get(users)
    let foundUser: User = $users.find((u: User) => u.pubkey == evt.pubkey)
    if (!foundUser) {
        let user: User = {
            ...JSON.parse(evt.content),
            pubkey: evt.pubkey,
            content: JSON.stringify(evt.content),
            refreshed: now(),
            relays: [relay]
        }
        const regex = new RegExp('(http(s?):)|([/|.|\w|\s])*\.(?:jpg|gif|png)');
        if (!regex.test(user.picture)) {
            user.picture = 'profile-placeholder.png'
        }
        annotateUsers(user)
    }
    //Update user metadata (foundUser should be a reference, so update should work like this)
    if (foundUser && foundUser.refreshed < (now() - 60 * 10)) {
        if (foundUser.relays && foundUser.relays.length && foundUser.relays.find((r: string) => r != relay)) {
            foundUser.relays.push(relay)
        } else {
            foundUser.relays = [relay]
        }
        let content = JSON.parse(evt.content)
        foundUser = {
            ...foundUser,
            name: content.name,
            about: content.about,
            picture: content.picture,
            content: evt.content,
            refreshed: now(),
        }
        annotateUsers(foundUser)
    }
}

function initNote(note: Note) {
    note.replies = []
    note.downvotes = 0
    note.upvotes = 0
    note.reactions = []
    return note
}

/**
 * Get the note from a relay and add user meta data to it (expensive)
 * 
 * @param ids 
 * @param relay 
 * @returns 
 */
async function getNotes(ids: Array<string>, relay: string): Promise<{ [key: string]: Note } | null> {
    let filter: Filter = {
        kinds: [1],
        'ids': ids
    }
    console.debug('getNotes: filter ', filter)

    if (!ids.length) return
    let result = await channels.getter.all(filter)
    if (!result) return null // No result to be found :(

    let data: { [key: string]: Note } | null = null
    for (let i = 0; i < result.length; i++) {
        let note: Note = result[i] // We get more of the same, depending on the number of relays.
        note = initNote(note)
        let user: User = get(users).find((u: User) => u.pubkey == note.pubkey)
        note.user = user
        if (!user) {
            fetchMetaDataUser(note, relay)
        }
        data[note.id] = note
        noteStack[note.id] = note
    }
    return data
}

export const noteStack = writable(getLocalJson('halonostr/notestack') || {})
noteStack.subscribe($stack => {
    setLocalJson('halonostr/notestack', $stack)
})

/**
 * Expensive operation and last resort to get a root to make a tree
 * 
 * @param evt 
 * @param replies 
 * @param relay 
 * @returns 
 */
async function processReplyFeed(evt: Event, replies: Array<Event>, relay: string = ''): Promise<Note | null> {
    let $noteStack = get(noteStack)
    let rootNote: Note

    if (replies.length > 0) {
        replies = uniqBy(prop('id'), replies)

        let map = {}
        let list = {}
        for (let i = 0; i < replies.length; i++) {
            let reply: Note = replies[i]
            let rootTag = getRootTag(reply.tags)
            let replyTag = getReplyTag(reply.tags)
            if (rootTag && replyTag && rootTag[1] != replyTag[1]) {
                reply = initNote(reply)
                let user: User = get(users).find((u: User) => u.pubkey == reply.pubkey)
                reply.user = user // can be undefined, then let the promise get the needed data
                if (!user) {
                    fetchMetaDataUser(reply, relay)
                }
                rootNote = reply
                $noteStack[rootNote.id] = rootNote
            }
            map[replyTag[1]] = reply.id
            list[reply.id] = reply
        }
        if (!rootNote) {
            console.debug('processReplyFeed:: No rootnote found ', replies)
            return null // No context, so we quit 
        }
        //Build the rest of the tree
        let keys = Object.keys(map)
        for (let i = 0; i < keys.length; i++) {
            let replyToId = map[keys[i]]
            let replyToNote = list[keys[i]]
            let parent = list[replyToId] ? list[replyToId] : null
            if (parent) {
                if (!parent.user) {
                    fetchMetaDataUser(parent, relay)
                }
                if (!replyToNote) {
                    fetchMetaDataUser(replyToNote, relay)
                }
                parent.replies.push(replyToNote)
            }
        }
        console.debug('processReplyFeed:: Created list ', list)
    }
    console.debug('processReplyFeed:: No replies for ', evt)
    return null
}

/**
 * Make sure that what we did we also see in the view
 * 
 * @param rootNote 
 */
function syncNoteTree(rootNote: Note) {
    if (typeof rootNote !== 'undefined' && rootNote) {
        console.debug('syncNoteTree: Add/update a note: ', rootNote)
        let byCreatedAt = descend<Note>(prop("created_at"));
        notes.update((data: Array<Note>) => {
            if (!data.length) {
                data = []
            }
            let note: Note = data.find(n => n.id == rootNote.id)
            if (note) {
                note = rootNote //replace it with updated data
                console.debug('syncNoteTree: Updated note ', note)
                return data
            }
            data.unshift(rootNote)
            data = uniqBy(prop('id'), data)
            data = sort(byCreatedAt, data)
            return data
        })
    }
}

/**
 * Adds user data like name, about , picture when it is available
 * 
 * @param note Note
 * @param relay string
 * @returns 
 */
async function annotateNote(note: Note, relay: string): Promise<void> {
    console.debug('annotateNote: User ', note.pubkey)
    if (!note.user) {
        let result = get(users).filter((u: User) => u.pubkey == note.pubkey)
        note.user = result && result.length ? result[0] : []
    }

    if (!note.user || note.user.refreshed > now() - (60 * 10)) {
        console.debug('annotateNote:: fetch user data for ', note.pubkey)
        fetchMetaDataUser(note, relay).then(() => {
            console.debug('annotateNote: Promise result by ref ', note.user)
        })
    }
}

/**
 * Make sure this does not run amok and become a bottleneck
 * 
 * @param note 
 * @param replyTag 
 * @param depth 
 * @returns 
 */
function findRecursive(note: Note, replyTag: Array<string>, depth: number = 1): Note | null {
    if (depth > 6) return null
    if (note) {
        if (note.id == replyTag[1]) {
            return note
        }
        if (note.replies && note.replies.length) {
            let result = null
            for (let i: number = 0; i < note.replies.length; i++) {
                result = findRecursive(note.replies[i], replyTag, ++depth)
            }
            return result
        }
    }
    return null
}

export const blocklist = writable(getLocalJson("halonostr/blocklist") || [])
let $blocklist = get(blocklist)
blocklist.subscribe((value) => {
    setLocalJson('halonostr/blocklist', value)
})

export const blocktext = writable(getLocalJson("halonostr/blocktext") || [])
let $blocktext = get(blocktext)
blocklist.subscribe((value) => {
    setLocalJson('halonostr/blocktext', value)
})

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
async function handleTextNote(evt: Event, relay: string): Promise<void> {
    
    if ($blocklist.find((b:{pubkey:string,added:number}) => b.pubkey == evt.pubkey)) {
        console.debug('handleTextNote:: user on blocklist ', evt)
        return
    }
    // TODO: block base on certain text soon to come

    let note: Note = initNote(evt)
    note.relays = [relay]
    let rootNote: Note
    let $noteStack = get(noteStack)

    console.debug('handleTextNote: input ', evt)
    if ($noteStack[evt.id]) {
        console.debug('handleTextNote: Already added this input ', evt)
    }
    $noteStack[evt.id] = note

    let rootTag = getRootTag(evt.tags)
    let replyTag = getReplyTag(evt.tags)
    // Root, no need to look up replies
    if (rootTag.length == 0 && replyTag.length == 0) {
        annotateNote(note, relay)
            .then(() => {
                rootNote = note
                syncNoteTree(rootNote)
            })
        return
    }

    // Reply to root only 1 e tag
    if (rootTag.length && replyTag.length && replyTag[1] == rootTag[1]) {
        console.debug("handleTextNote: Replytag and RootTag are the same", rootTag, replyTag, evt)
        let rootNote = get(notes).find((n: Note) => n.id == rootTag[1])
        if (rootNote) { // Put getting extra data in a WebWorker for speed.
            annotateNote(note, relay)
                .then(() => {
                    if (!rootNote.replies) rootNote.replies = []
                    rootNote.replies.push(note)
                    rootNote.replies = uniqBy(prop('id'), rootNote.replies)
                    syncNoteTree(rootNote)
                });
            return
        }
    }

    // First try to find the parent in the existing tree before more expensive operations
    // are needed
    if (rootTag.length && replyTag.length && rootTag[1] != replyTag[1]) {
        let rootNote = get(notes).find(n => n.id == rootTag[1])
        if (rootNote && rootNote.replies && rootNote.replies.length) {
            let replyNote: Note | null = findRecursive(rootNote, replyTag)
            if (!replyNote) console.debug('handleTextNote: Need to do expensive stuff and get the whole tree from a relay.', evt)
            if (replyNote) {
                annotateNote(note, relay)
                    .then(() => {
                        replyNote.replies.push(note)
                        replyNote.replies = uniqBy(prop('id'), replyNote.replies)
                        syncNoteTree(rootNote)
                    });
                return
            }
        }
    }

    // get all the events under this eventId
    let filter: Filter = {
        kinds: [1],
        '#e': [evt.id]
    }
    console.debug('handleTextNote: Filter to get replies ', filter)
    channels.getter.all(filter)
        .then((replies: Array<Event>) => processReplyFeed(evt, replies, relay))
        .then(() => {
            console.debug('handleTextNote: Current stack: ', $noteStack)
            syncNoteTree(rootNote)
        })
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
        console.debug('handleReaction:: Reaction Old style or no reply tag', evt)
        return
    }
    const eventId: string = replies[0][1];

    console.debug('handleReaction:: :: Reaction: ', eventId)

    let note: Note
    let result = $notes.filter((n: Note) => n.id == eventId)
    if (result.length) {
        note = result[0]
        console.debug('handleReaction:: Reaction Root ', note)
    }

    if (!result.length) {
        console.debug('handleReaction:: Reaction Is not root ;)', evt)
        for (let i = 0; i < $notes.length; i++) {
            let rootNote: Note = $notes[i]
            result = rootNote.replies.filter((n: Note) => n.id == eventId)
            if (result.length) {
                note = result[0]
                break
            }
        }
        console.debug('handleReaction:: Reaction Is not root ;)'), evt
    }

    if (!note && rootTag) {
        let rootNote = $notes.find((n: Note) => n.id == rootTag[1])
        if (!rootNote) return
        if (rootNote && rootNote.id == replyTag[1]) note = rootNote

        let replies: Array<Note> = Object.values(rootNote.replies)
        let v = replies.find(n => n.id == replyTag[1])
        if (v) {
            console.debug("handleReaction:: Reaction replies ", v, evt)
            note = v
        }

        if (!note) {
            for (let index in replies) {
                if (replies[index].replies) {
                    let n = replies[index].replies.find(n => n.id == replyTag[1])
                    if (n) {
                        note = n
                        console.debug("handleReaction:: Reaction replies of the replies", n)
                        break
                    }
                }
            }
        }

        console.debug('---------', rootTag, evt.tags)
    }
    console.debug('handleReaction:: Reaction found node: ', note)

    if (note) {
        let reaction: Reaction = evt
        note.relays = [relay]

        if (note.reactions) {
            if (note.reactions.find(r => r.id == evt.id)) {
                console.debug('handleReaction:: Reaction Already added this reaction', evt)
                return // Already processed this reaction from another relay. Not gonna count it twice, thrice
            }
        }

        if (note.reactions && !note.reactions.find(r => {
            return r.id == evt.id
        })) {
            note.reactions.push(reaction)
            console.debug('handleReaction:: Reaction Added reaction', reaction)
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


