import { get, writable, type Writable } from 'svelte/store'
import { users, annotateUsers, formatUser } from '../stores/users'
import { delay, now } from "../util/time"
import { find } from "../util/misc"
import { uniq, pluck, difference, uniqBy, last } from 'ramda'
import type { User, TextNote, Reaction } from './types'
import type { Event, Filter, Sub } from 'nostr-tools'
import { pool, getData, waitForOpenConnection } from './pool'
import { prop, sort, descend } from "ramda";
import { setLocalJson, getLocalJson } from '../util/storage'
import { getRootTag, getReplyTag, getLastETag } from '../util/tags';
import { log } from '../util/misc';
import { blocklist } from '../stores/block'
import { account } from '../stores/account'

let $users = get(users)
let $blocklist = get(blocklist)
let $account = get(account);
if (!$users) $users = []
if (!$blocklist) $blocklist = []

export const feed: Writable<Array<TextNote>> = writable([]) // Kind 1 feed 
export const contacts: Writable<{ [key: string]: User }> = writable()

export const blacklist: Writable<Array<string>> = writable([
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
])

export const hasEventTag = (tag: Array<string>) => tag[0] === 'e'

export const queue: Writable<Array<string>> = writable([])

export const loading: Writable<boolean> = writable(false)

export const blocktext = writable(getLocalJson("halochat/blocktext") || [])
blocklist.subscribe((value) => {
    setLocalJson('halochat/blocktext', value)
})

export const feedStack = writable([])

/**
 * Kind 3
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/02.md
 */
export function getContactlist(pubkey): Promise<Array<Event>> {
    let filter: Filter = {
        kinds: [3],
        authors: [pubkey]
    }
    log('getContactlist', filter)
    if (!pubkey) {
        log('error', 'No account pubkey')
        return Promise.reject('No account pubkey')
    }

    return getData(filter)
}

export async function getFollowList(pubkey: string) {
    let followList: { [key: string]: User } = {};

    return getContactlist(pubkey)
        .then((contacts: Array<Event>) => {
            contacts[0].tags.forEach((tag) => {
                if (tag[0] == "p") {
                    followList[tag[1]] = {
                        pubkey: tag[1],
                        name: "",
                        about: "",
                        picture: "",
                        content: "",
                        refreshed: now(),
                        relays: [],
                    };
                }
            });
            return followList;
        })
        .then((followList) => {
            const pubkeys: string[] = Object.keys(followList);
            return { ids: pubkeys, list: followList };
        })
        .then((data) => fetchUsers(data.ids, ""))
        .then((users: Array<User>) => {
            users.forEach((user: User) => {
                followList[user.pubkey] = user;
            });
            contacts.set(followList)
            return followList;
        });
}

/**
 * Got an kind 0 event from the feed
 *  
 * @param evt 
 * @param relay 
 */
function handleMetadata(evt: Event, relay: string) {
    try {
        setMetadata(evt, relay);
    } catch (err) {
        log(evt);
        log("error", err);
    }
}

/**
 * Request a single user
 * Kind 0
 * 
 * @param pubkey 
 * @param relay 
 * @returns 
 */
export async function fetchUser(pubkey: string, relay: string): Promise<User> {
    let filter: Filter = {
        kinds: [0],
        authors: [pubkey]
    }
    return getData(filter)
        .then((fetchResultUsers: Array<Event>) => {
            let user: User
            if (fetchResultUsers.length) {
                user = formatUser(fetchResultUsers[0], relay)
            }
            if (fetchResultUsers.length == 0) {
                let unkownUser = {
                    pubkey: pubkey,
                    name: 'unknown',
                    about: '',
                    picture: 'profile-placeholder.png',
                    content: '',
                    refreshed: now(),
                    relays: [relay]
                }
                user = unkownUser
            }
            annotateUsers(user)
            return user
        });
}

/**
 * Request a bunch of user metadata
 *  
 * Kind 0
 * 
 * @param pubkeys 
 * @param relay 
 * @returns 
 */
export async function fetchUsers(pubkeys: Array<string>, relay: string): Promise<Array<User>> {
    let filter: Filter = {
        kinds: [0],
        authors: pubkeys
    }
    let result = []
    return getData(filter)
        .then((fetchResultUsers: Array<Event>) => {
            for (let i = 0; i < pubkeys.length; i++) {
                let user: User = {
                    pubkey: pubkeys[i],
                    name: 'unknown',
                    about: '',
                    picture: 'profile-placeholder.png',
                    content: '',
                    refreshed: now(),
                    relays: [relay]
                }

                if (fetchResultUsers.length) {
                    let evt: Event = fetchResultUsers.find(e => e.pubkey = pubkeys[i])
                    user = formatUser(evt, relay)
                }
                annotateUsers(user)
                result.push(user)
            }
            return result;
        });
}

/**
 * No request made
 * 
 * @param evt Event
 * @param relay string
 * @param content string
 */
function setMetadata(evt: Event, relay: string) {
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

function initNote(note: TextNote) {
    note.replies = []
    note.downvotes = 0
    note.upvotes = 0
    note.reactions = []
    note.tree = 0 // rootnote
    return note
}

/**
 * Expensive operation and last resort to get a root to make a tree
 * 
 * @param evt 
 * @param replies 
 * @param relay 
 * @returns 
 */
async function processReplyFeed(evt: Event, replies: Array<Event>, relay: string = ''): Promise<TextNote | null> {
    let $feedStack = get(feedStack)
    let rootNote: TextNote | null

    log('processReplyFeed:: start. Based on these replies ', replies)
    if (replies.length > 0) {
        replies = uniqBy(prop('id'), replies)

        let map = {}
        let list = {}
        let rootTag = []
        for (let i = 0; i < replies.length; i++) {
            let reply: TextNote = initNote(replies[i])

            if (!rootTag.length) rootTag = getRootTag(reply.tags)
            let replyTag = getReplyTag(reply.tags)

            // Search the start of the thread
            $feedStack[reply.id] = reply
            if (map[replyTag[1]]) {
                map[replyTag[1]].push(reply)
            } else {
                map[replyTag[1]] = [reply]
            }
            list[reply.id] = reply
        }

        log('processReplyFeed:: start of thread rootTag content ', rootTag, rootNote)
        if (rootTag) { // Try one more time to get the root note
            let k = Object.keys(list)
            let filter: Filter = {
                kinds: [1],
                '#e': k
            }
            log('processReplyFeed:: Attempt to find rootNote with this filter', filter)
            rootNote = await getData(filter)
                .then((data: Event | Array<Event> | null) => {
                    console.log('processReplyFeed:: Return data: ', data)
                    if (Array.isArray(data)) data = data[0] // Can happen if all of a sudden all relays respond at the same time
                    if (data && data !== undefined) {
                        if (!data.id) console.error('processReplyFeed:: unexpected return value ', data)
                        $feedStack[data.id] = data
                        let rootNode = initNote(data)
                        return rootNode
                    }
                    return null
                }).then(rootNode => {
                    if (!rootNode) return null

                    let keys = Object.keys(map)
                    console.log('processReplyFeed:: Keys', keys, list, map, rootNode)

                    let parent
                    for (let i = 0; i < keys.length; i++) {
                        parent = list[keys[i]] ? list[keys[i]] : null
                        if (!parent) {
                            console.log('processReplyFeed:: parent node Not in result set ', keys[i])
                            getData({ ids: [keys[i]], kinds: [1] })
                                .then((data) => {
                                    if (Array.isArray(data)) parent = data[0]
                                    console.log('processReplyFeed:: parent node Not in result set result get data', data)
                                })
                        }

                        Object.values(map[keys[i]]).forEach((replyId: string) => {
                            if (parent) {
                                if (!parent.replies) parent.replies = []
                                let item = list[replyId]
                                item.tree = parent.tree + 1
                                parent.replies.push(list[replyId])
                            }
                        })

                        if (keys[i] == rootNode.id && parent) {
                            rootNode.replies.push(parent)
                        }
                    }
                    return rootNode
                })
            return rootNote
        }
        return null
    }
    log('processReplyFeed:: No replies for ', evt)
    return null
}

/**
 * Make sure that what we did we also see in the view
 * 
 * @param rootNote 
 */
function syncNoteTree(rootNote: TextNote) {
    if (typeof rootNote !== 'undefined' && rootNote) {
        log('syncNoteTree: Add/update a note: ', rootNote)
        let byCreatedAt = descend<TextNote>(prop("created_at"));
        feed.update((data: Array<TextNote>) => {
            if (!data || !data.length) {
                data = []
            }
            let note: TextNote = data.find(n => n.id == rootNote.id)
            if (note) {
                note = rootNote //replace it with updated data
                log('syncNoteTree: Updated note ', note)
                return data
            }
            data.unshift(rootNote)
            data = uniqBy(prop('id'), data)
            data = sort(byCreatedAt, data)
            return data
        })
    }
}

let batchUser = writable([])
batchUser.subscribe(data => {
    if (data.length > 10) {
        fetchUsers(data, '')
    }
    return []
})



/**
 * Adds user data like name, about , picture when it is available
 * 
 * @param note Note
 * @param relay string
 * @returns 
 */
async function annotateNote(note: TextNote, relay: string): Promise<TextNote> {
    log('annotateNote: User ', note.pubkey)
    if (!note.user) {
        let result = Array.isArray($users) ? $users.filter((u: User) => u.pubkey == note.pubkey) : null
        note.user = result && result.length ? result[0] : []
    }

    if (!note.user || note.user.refreshed > now() - (60 * 10)) {
        log('annotateNote:: fetch user data for ', note.pubkey)
    }

    return note
}


function checkQueue() {
    if (feedQueue.length === 0) {
        clearInterval(feedQueueTimer)
        feedQueueTimer = null
    }
}

function blockText(evt: Event): boolean {
    if (evt.content.match(/followid/)) return true
    if (evt.content.match(/Verifying\ My\ Public\ Key/)) return true
    return false
}
/**
 * Kind 1
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 * 
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
async function handleTextNote(): Promise<void> {
    if (!feedQueue.length) return
    const eventItem = feedQueue.shift()
    let evt = eventItem.textnote
    const relay = eventItem.url

    if (pool.hasRelay('ws://localhost:8008')) {
        pool.getRelays()['ws://localhost:8008'].publish(evt)
    }

    let $lastSeen = get(lastSeen)
    let tags = evt.tags.filter(t => t[0] == 'e')
    if (tags.length == 0) {
        if ($lastSeen < evt.created_at) {
            $lastSeen = evt.created_at
        }
    }

    if ($blocklist.find((b: { pubkey: string, added: number }) => b.pubkey == evt.pubkey)) {
        log('handleTextNote:: user on blocklist ', evt)
        checkQueue()
        return
    }
    if (blockText(evt)) {
        checkQueue()
        return
    }

    let $feed = get(feed)
    if ($feed.find(f => f.content == evt.content)) {
        checkQueue()
        return
    }

    let note: TextNote = initNote(evt)
    note.relays = [relay]
    let rootNote: TextNote
    let $feedStack = get(feedStack)

    console.debug('handleTextNote: input ', evt)
    if ($feedStack[evt.id]) {
        log('handleTextNote: Already added this input ', evt)
    }
    $feedStack[evt.id] = note

    let rootTag = getRootTag(evt.tags)
    let replyTag = getReplyTag(evt.tags)
    // Root, no need to look up replies
    if (rootTag.length == 0 && replyTag.length == 0) {
        handleMentions(note)
            .then((note) => annotateNote(note, relay))
            .then((note) => {
                rootNote = note
                syncNoteTree(rootNote)
            })
        checkQueue()
        return
    }

    // Reply to root only 1 e tag
    if ($feed && rootTag.length && replyTag.length && replyTag[1] == rootTag[1]) {
        log("handleTextNote: Replytag and RootTag are the same", rootTag, replyTag, evt)
        let rootNote = $feed.find((n: TextNote) => n.id == rootTag[1])
        if (rootNote) { // Put getting extra data in a WebWorker for speed.
            handleMentions(note)
                .then((note) => annotateNote(note, relay))
                .then((note) => {
                    note.tree = 1
                    if (!rootNote.replies) rootNote.replies = []
                    rootNote.replies.push(note)
                    rootNote.replies = uniqBy(prop('id'), rootNote.replies)
                    syncNoteTree(rootNote)
                });
            checkQueue()
            return
        }
    }

    // First try to find the parent in the existing tree before more expensive operations
    // are needed
    if ($feed && rootTag.length && replyTag.length && rootTag[1] != replyTag[1]) {
        let rootNote = $feed.find(n => n.id == rootTag[1])
        if (rootNote && rootNote.replies && rootNote.replies.length) {
            let replyNote: TextNote | null = find(rootNote, replyTag[1])
            if (!replyNote) log('handleTextNote: Need to do expensive stuff and get the whole tree from a relay.', evt)
            if (replyNote) {
                handleMentions(note)
                    .then((note) => annotateNote(note, relay))
                    .then((note) => {
                        note.tree = 2
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
    log('handleTextNote: Filter to get replies ', filter)
    getData(filter)
        .then((replies: Array<Event>) => processReplyFeed(evt, replies, relay))
        .then((rootNote: TextNote | null) => {
            log('handleTextNote: Current stack: ', $feedStack)
            if (rootNote) syncNoteTree(rootNote)
        })
    checkQueue()
}

async function handleMentions(note: TextNote): Promise<TextNote> {
    if (note && !note.content) {
        log('handleMentions:: This should never ever happen, but it did', note)
        return note
    }
    let reg = /#\[[0-9]+\]/
    let matches = note.content.match(reg)
    if (matches && matches.length) {
        log('handleMentions:: ', note)
        for (let i = 0; i < matches.length; i++) {
            let tag = Object.values(note.tags)[i]
            let replaceValue = tag[1].slice(0, 5) + '...' + tag[1].slice(-5)

            if (tag[0] != 'e' && tag[0] != 'p') continue;
            if (tag[0] == 'p') {
                let u = Array.isArray($users) ? $users.find((p: User) => p.pubkey == tag[1]) : null
                if (!u) {
                    log('handleMentions::Getting user metadata if there is any')
                    u = await fetchUser(tag[1], '')
                    log('handleMentions::Getting user result', u)
                }
                if (u && u.name && u.name != 'unknown') {
                    replaceValue = u.name.slice(0, 10)
                }
            }
            log('handleMentions:: replace ', matches[i], ' with ', replaceValue)
            note.content = note.content.replaceAll(matches[i], replaceValue)
        }
        log('handleMentions:: new note content: ', note.content)
    }
    return note;
}

function handleReaction(evt: Event, relay: string) {
    let $feed = get(feed)
    if (!$feed || !$feed.length) return

    let lastTag = getLastETag(evt.tags)
    if (!lastTag) {
        log('handleReaction:: Misformed tags.. ignore it', 'Tags:', evt.tags, 'Event:', evt)
    }

    let rootTag = getRootTag(evt.tags)
    let replyTag = getReplyTag(evt.tags)

    console.debug("handleReaction:: Event ", evt)
    let note: TextNote | null = null
    if (rootTag.length && rootTag == lastTag) {
        note = $feed.find((n: TextNote) => n.id == lastTag[1])
    }

    if (rootTag.length && replyTag.length && rootTag != lastTag) {
        // Now we are talking
        log('handleReaction:: Time for recursive search', 'RootTag: ', rootTag, 'ReplyTag:', replyTag, 'Event:', evt)
        let rootNote = $feed.find((n: TextNote) => n.id == rootTag[1])
        if (rootNote) {
            let result = find(rootNote, lastTag[1])
            if (result) {
                note = result
            }
        }
    }

    if (note) {
        log('handleReaction:: Reaction found node: ', note)

        let reaction: Reaction = evt
        note.relays = [relay]

        if (note.reactions) {
            if (note.reactions.find(r => r.id == evt.id)) {
                log('handleReaction:: Reaction Already added this reaction', evt)
                return // Already processed this reaction from another relay. Not gonna count it twice, thrice
            }
        }

        if (note.reactions && !note.reactions.find(r => {
            return r.id == evt.id
        })) {
            note.reactions.push(reaction)
            note.reactions = uniqBy(prop('id'), note.reactions)
            log('handleReaction:: Reaction Added reaction', note, reaction)
        }

        if (!note.reactions) {
            note.reactions = [reaction]
            log('handleReaction:: Reaction Added reaction', note, reaction)
        }

        if (!note.upvotes) note.upvotes = 0
        if (!note.downvotes) note.downvotes = 0

        if (evt.content == '+' || evt.content == "") note.upvotes = note.upvotes + 1
        if (evt.content == '-') note.downvotes = note.downvotes + 1

        feed.update(data => data) // make sure the view is updated without this, it will not
    }
}

/**
 * @todo: this will be time consuming, need to find a faster way to parse the tree for the ids i want
 * 
 * @param evt 
 * @param relay 
 */
function handleDelete(evt, relay) {
    let pubkey = evt.pubkey
    let eventsToDelete: Array<any> = evt.tags.filter((e: Event) => e[0] == 'e')
    let $feed = get(feed)

    let rootNotes: Array<TextNote> = $feed.filter(e => e.tree == 0)
    for (let i = 0; i < rootNotes.length; i++) {
        for (let n = 0; n < eventsToDelete.length; n++) {
            let searchEventId = eventsToDelete[n][1]
            let foundNote = find(rootNotes[i], searchEventId)
            if (foundNote && foundNote.pubkey == pubkey) {
                foundNote.content = '<i class="fa-solid fa-triangle-exclamation"></i> Note deleted. Reason: ' + evt.content
                continue
            }
        }
    }
}


export class Listener {
    filter: Filter
    subs: { [key: string]: Sub } = {}
    id: string
    constructor(filter: Filter, id?: string) {
        this.filter = filter
        if (!this.id) {
            'listener' + now()
        }
    }

    async start() {
        for (const [url, relay] of Object.entries(pool.getRelays())) {
            if (relay.status !== 1) {
                try {
                    await waitForOpenConnection(relay)
                } catch (err) { console.error(err) }
            }

            this.subs[url] = relay.sub([this.filter], { id: this.id })

            this.subs[url].on('event', event => {
                onEvent(event, url)
            })
            this.subs[url].on('eose', r => {
                (r: string) => { log('Eose from ', r) }
            })
        }
    }
    stop() {
        for (const [url, sub] of Object.entries(this.subs)) {
            sub.unsub()
            console.log(`Stop listening to relay ${url} by unsubscribe to events and eose`)
        }
    }
}

let feedQueue: Array<{ textnote: Event, url: string }> = []
let feedQueueTimer = null

export let lastSeen = writable(getLocalJson('halochat/lastseen') || now() - 60 * 60)
export function onEvent(evt: Event, relay: string) {
    switch (evt.kind) {
        case 0:
            handleMetadata(evt, relay)
            break
        case 1:
            feedQueue.push({ textnote: evt, url: relay })
            if (feedQueueTimer === null) {
                feedQueueTimer = setInterval(handleTextNote, 1000)
            }
            //handleTextNote(evt, relay)
            break
        case 3:
            // Update contact list, and seeing other contact lists
            break
        case 5:
            handleDelete(evt, relay)
            break
        case 7:
            handleReaction(evt, relay)
            break
        case 40:
            /**
             * @see https://github.com/nostr-protocol/nips/blob/master/28.md
             * channel create
             */
            break;
        case 41: //channel metadata
            break;
        case 42: // channel message
            break;
        case 43: // hide message
            break;
        case 44: //mute user
            break;

        default:
            log(`Got an unhandled kind ${evt.kind}`)
    }
}


