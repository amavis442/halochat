import { get, writable, type Writable } from 'svelte/store'
import { users, annotateUsers, formatUser, initUser } from '../stores/users'
import { now } from "../util/time"
import { find } from "../util/misc"
import { uniq } from 'ramda'
import type { User, TextNote, Reaction, Account } from './types'
import type { Event, Filter, Relay, Sub } from 'nostr-tools'
import { pool, getData, waitForOpenConnection } from './pool'
import { setLocalJson, getLocalJson, setting } from '../util/storage'
import { getRootTag, getReplyTag, getLastETag } from '../util/tags';
import { log } from '../util/misc';
import { blocklist } from '../stores/block'
import { account } from '../stores/account'

let $users: Array<User> = get(users)
let $blocklist: Array<{ pubkey: string, added: number }> = get(blocklist)
let $account: Account = get(account);
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

export const blocktext = writable(getLocalJson(setting.Blocktext) || [])
blocktext.subscribe((value) => {
    setLocalJson(setting.Blocktext, value)
})

export const feedStack = writable({})

export const notifications = writable(0)
/**
 * Kind 3
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/02.md
 */
export function getContactlist(pubkey: string): Promise<Array<Event>> {
    let filter: Filter = {
        kinds: [3],
        authors: [pubkey]
    }
    log('getContactlist', filter)
    if (!pubkey) {
        log('error', 'No account pubkey')
        return Promise.reject('No account pubkey')
    }

    return getData([filter])
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
                let unkownUser: User = initUser(pubkey, relay)
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
    pubkeys = uniq(pubkeys)
    pubkeys = pubkeys.map(pubkey => {
        if (!$users.find((u: User) => u.pubkey == pubkey && u.name != pubkey)) {
            return pubkey
        }
    })

    let filter: Filter = {
        kinds: [0],
        authors: pubkeys
    }
    let result = []
    return getData(filter, "fetchUsers")
        .then((fetchResultUsers: Array<Event>) => {
            for (let i = 0; i < pubkeys.length; i++) {
                let user: User = initUser(pubkeys[i], relay)
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

function initNote(note: TextNote | null) {
    if (!note) {
        note = {
            id: 'unknown',
            pubkey: 'unknown',
            content: 'Unknown',
            tags: [],
            created_at: now(),
            kind: 1
        }
    }
    if (!note?.replies) note.replies = []
    if (!note?.downvotes) note.downvotes = 0
    if (!note?.upvotes) note.upvotes = 0
    if (!note?.reactions) note.reactions = []
    if (!note?.relays) note.relays = []
    if (!note?.tree) note.tree = 0 // rootnote
}

async function handleTags(noteId: string) {
    let $feedStack = get(feedStack)
    let note = $feedStack[noteId] || []

    if (note.tags.length) {
        let rootTag = getRootTag(note.tags)
        let replyTag = getReplyTag(note.tags)

        // Is root
        if (rootTag.length == 0 && replyTag.length == 0) {
            console.log("handleTags:: is Rootnote", note)
            return note
        }

        // Is reply to root
        if (rootTag.length && replyTag.length && rootTag == replyTag) {
            console.log("handleTags:: ", note.tags)
            let rootNote = $feedStack[rootTag[1]] || []
            if (rootNote) {
                note.tree = (rootNote.tree ? rootNote.tree : 0) + 1
                if (!rootNote.replies) rootNote.replies = []
                if (!rootNote.replies.find(r => r.id == note.id)) {
                    rootNote.replies.push(note)
                }
                console.log("handleTags:: is reply to Rootnote", rootNote, 'Child ', note)
            }
            if (!rootNote) {
                let filter: Filter = { kinds: [1], 'ids': [replyTag[1]] }
                return await getData([filter])
                    .then((results: Array<Event>) => {
                        if (results && results.length) {
                            let item: TextNote = results[0]
                            initNote(item)
                            feedStack.update(data => {
                                data[item.id] = item
                            })
                            rootNote = $feedStack[item.id]
                            if (!rootNote.replies.find(r => r.id == note.id)) {
                                rootNote.replies.push(note)
                            }
                        }
                    })
            }
        }

        //Is reply to reply
        if (rootTag.length && replyTag.length && rootTag != replyTag) {
            let rootNote = $feedStack[rootTag[1]] || []
            if (rootNote && rootNote.replies && rootNote.replies.length) {
                let replyNote: TextNote | null = $feedStack[replyTag[1]] || []
                if (replyNote) {
                    note.tree = (replyNote.tree ? replyNote.tree : 0) + 1
                    if (!replyNote.replies.find(r => r.id == note.id)) {
                        replyNote.replies.push(note)
                    }
                }
                console.log("handleTags:: is reply to Replynote", replyNote, ' of rootNote ', rootNote)
            }

            console.log("handleTags:: rootTag <> replyTag", note.tags)

            if (!rootNote) {
                let filter1: Filter = { kinds: [1], '#e': [rootTag[1]] }
                let filter2: Filter = { ids: [rootTag[1]], kinds: [1] }
                console.log("handleTags:: rootTag <> replyTag filter", filter1, filter2)
                return await getData([filter1, filter2])
                    .then((results: Array<Event>) => {
                        console.log("handleTags:: rootTag <> replyTag result of this filter", results, ' of filter ', filter1, filter2)
                        if (results && results.length) {

                            feedStack.update(data => {
                                results.reduce((acc, el, i) => {
                                    acc[el.id] = el;
                                    initNote(el)
                                    data[el.id] = el
                                    return acc;
                                }, {});
                                return data
                            })

                            /**
                             * @see https://typeofnan.dev/an-easy-way-to-build-a-tree-with-object-references/
                             */
                            results.forEach((el: TextNote) => {
                                let tag = getReplyTag(el.tags)
                                let rootTag = getRootTag(el.tags)
                                if (!rootNote && rootTag == replyTag) {
                                    if ($feedStack[rootTag[1]]) {
                                        rootNote = $feedStack[rootTag[1]]
                                    }
                                }

                                // Use our mapping to locate the parent element in our data array
                                let note = $feedStack[tag[1]]
                                let parentEl: TextNote = note;
                                if (!parentEl) {
                                    let rootTag = getRootTag(el.tags)
                                    parentEl = $feedStack[rootTag[1]] || []
                                }

                                el.tree = (parentEl.tree ? parentEl.tree : 0) + 1
                                // Add our current el to its parent's `children` array
                                parentEl.replies = [...(parentEl.replies || []), el];
                            });
                            console.log("handleTags:: Build tree result ", rootNote, ' from ', results)
                        }
                    })
            }
        }
    }
}

async function handleUser(noteId: string) {
    let $feedStack = get(feedStack)
    let note: TextNote = $feedStack[noteId] || []
    if (!note) return

    let foundUser: User = $users.find((u: User) => u.pubkey == note.pubkey)
    if (!foundUser) {
        return fetchUsers([note.pubkey], '')
            .then((users: Array<User>) => {
                note.user = users[0]
                return note
            })
    }
    note.user = foundUser
}


let userMapping = []

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

        $users.push(initUser(note.pubkey, relay))
        let user = $users.find(u => u.pubkey = note.pubkey)
        note.user = user
        let result: Array<User> | null = Array.isArray($users) ? $users.filter((u: User) => u.pubkey == note.pubkey) : null
        if (result && result.length) {
            note.user = result[0]
        }
    }

    if (!note.user || note.user.refreshed > now() - (60 * 10)) {
        log('annotateNote:: fetch user data for ', note.pubkey)
    }

    if (!note.user || note.user.name == note.user.pubkey) {
        userMapping.push({ pubkey: note.pubkey, user: note.user }) // this should make referencing easier, i think
    }
    return note
}

function blockText(evt: Event): boolean {
    if (evt.content.match(/followid/)) return true
    if (evt.content.match(/Verifying\ My\ Public\ Key/)) return true
    return false
}

let queueUser: Writable<Array<string>> = writable([])
let $queueUser = get(queueUser)
export const mute: Writable<Array<string>> = writable([])
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
    let $feedStack = get(feedStack)
    let $mute = get(mute)

    const eventItem = feedQueue.shift()
    let evt = eventItem.textnote
    const relay = eventItem.url

    if ($account.pubkey != evt.pubkey && $blocklist.find((b: { pubkey: string, added: number }) => b.pubkey == evt.pubkey)) {
        log('handleTextNote:: user on blocklist ', evt)
        return
    }
    if (blockText(evt)) {
        return
    }

    /* if (Object.values($feedStack).find((f: TextNote) => f.content == evt.content)) {
        return
    } */

    let note: TextNote = evt
    initNote(note)
    note.relays.push(relay)


    console.debug('handleTextNote: input ', evt)
    if ($feedStack[evt.id]) {
        log('handleTextNote: Already added this input ', evt)
        return
    }

    feedStack.update(data => {
        data[evt.id] = note
        return data
    })

    let noteId = note.id

    return await
        handleTags(noteId)
            .then(() => handleDeletions(noteId))
            .then(() => handleReactions(noteId))
            .then(() => handleMentions(noteId))
            .then(() => handleUser(noteId))

            .then(() => {
                Object.values($feedStack).forEach((item: TextNote) => {
                    //console.log('feedStack entries', 'id is ', item, 'Event is', item)
                    let tags = item.tags.filter(t => t[0] == 'e')
                    if (!tags.length) {

                        feed.update(data => {
                            if (!data.find(d => d.id == item.id) && !$mute.find(m => m == item.id) && !$blocklist.find(b => b.pubkey == item.pubkey)) {
                                data.push(item)
                            }
                            return data
                        })
                    }
                })
                console.log('Feedstack is:', $feedStack)
            })

}

async function handleMentions(noteId: string): Promise<void> {
    let $feedStack = get(feedStack)
    let note = $feedStack[noteId] || []

    if (!note || !note.content) {
        log('handleMentions:: This should never ever happen, but it did', noteId)
        return
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
}

async function handleReaction(evt: TextNote, relay: string) {
    let lastTag = getLastETag(evt.tags)
    if (!lastTag) {
        log('handleReaction:: Misformed tags.. ignore it', 'Tags:', evt.tags, 'Event:', evt)
        return
    }
    initNote(evt)
    await new Promise((resolve) => {
        feedStack.update(data => {
            let note: TextNote = data[lastTag[1]] || null
            if (note && note.reactions && !note.reactions.find(r => r.id == evt.id)) {

                if (evt.content == '+' || evt.content == "") note.upvotes = note.upvotes + 1
                if (evt.content == '-') note.downvotes = note.downvotes + 1
                evt.relays.push(relay)
                note.reactions.push(evt)
                console.log('handleReaction:: Reactions ', note, lastTag[1])
            }
            return data
        })
        resolve(true)
    })
}

async function handleReactions(noteId: string) {
    let $feedStack = get(feedStack)
    let note: TextNote = $feedStack[noteId] || null
    if (!note) return note

    let filter: Filter = {
        kinds: [7],
        ids: [noteId]
    }
    console.log('handleReactions', filter)

    return await getData([filter], 'getReactions')
        .then((results: Array<Reaction>) => {
            if (!note.upvotes) note.upvotes = 0
            if (!note.downvotes) note.downvotes = 0

            for (let i = 0; i < results.length; i++) {
                let item: Reaction = results[i]
                let lastTag = getLastETag(item.tags)

                feedStack.update(data => {
                    if (data[lastTag[1]] && !data[lastTag[1]].reactions.find(r => r.id == item.id)) {
                        if (item.content == '+' || item.content == "") data[note.id].upvotes = data[note.id].upvotes + 1
                        if (item.content == '-') data[note.id].downvotes = data[note.id].downvotes + 1
                        data[note.id].reactions.push(item)
                    }
                    return data
                })

            }
            console.log('handleReactions: Got reactions ', note.reactions, results)
            return note
        })
}

/**
 * @todo: this will be time consuming, need to find a faster way to parse the tree for the ids i want
 * 
 * @param evt 
 * @param relay 
 */
function handleDelete(evt: Event, relay: string) {
    let pubkey = evt.pubkey
    let eventsToDelete: Array<any> = evt.tags.filter((t: Array<any>) => t[0] == 'e')
    let $feed = get(feed)
    console.log(`handleDelete:: Got a delete request from ${relay}`, evt)

    let rootNotes: Array<TextNote> = $feed.filter(e => e.tree == 0)
    for (let i = 0; i < rootNotes.length; i++) {
        for (let n = 0; n < eventsToDelete.length; n++) {
            let searchEventId = eventsToDelete[n][1]

            feedStack.update(data => {
                if (data[searchEventId]) {
                    data[searchEventId].content = '<i class="fa-solid fa-triangle-exclamation"></i> Note deleted. Reason: ' + evt.content
                }
                return data
            })


            let foundNote = find(rootNotes[i], searchEventId)
            if (foundNote && foundNote.pubkey == pubkey) {
                foundNote.content = '<i class="fa-solid fa-triangle-exclamation"></i> Note deleted. Reason: ' + evt.content
                continue
            }
        }
    }
}

async function handleDeletions(noteId: string) {
}

export async function isAlive() {
    let promises = []

    Object.values(pool.getRelays()).forEach((relay: Relay) => {
        if (relay.status === 0 || relay.status === 2 || relay.status === 3) {
            let promise = waitForOpenConnection(relay)
            promises.push(promise)
        }
    })

    return Promise.all(promises).then(() => {
        return true
    })
}

export class Listener {
    filter: Filter
    subs: { [key: string]: Sub } = {}
    id: string
    timer: string | number | NodeJS.Timeout

    constructor(filter: Filter, id?: string) {
        this.filter = filter
        if (!id) {
            this.id = 'listener' + now()
        } else {
            this.id = id
        }
        this.timer = null
    }
    async start() {
        for (const [url, relay] of Object.entries(pool.getRelays())) {
            if (relay.status !== 1) {
                try {
                    await waitForOpenConnection(relay)
                } catch (err) { console.error(err) }
            }

            this.subs[url] = relay.sub([this.filter], { id: this.id })

            this.subs[url].on('event', (event: Event) => {
                onEvent(event, url)
            })
            this.subs[url].on('eose', () => {
                log(`Eose from ${url}`)
            })
        }

        this.timer = setInterval(isAlive, 1000 * 60 * 5) // check every 5 minutes
    }
    stop() {
        for (const [url, sub] of Object.entries(this.subs)) {
            sub.unsub()
            console.log(`Stop listening to relay ${url} by unsubscribe to events and eose`)
        }
        clearInterval(this.timer)
    }
}

let feedQueue: Array<{ textnote: Event, url: string }> = []
let feedQueueTimer = null

export let lastSeen = writable(getLocalJson(setting.Lastseen) || now() - 60 * 60)
lastSeen.subscribe(value => {
    setLocalJson(setting.Lastseen, value)
})
export function onEvent(evt: Event, relay: string) {

    if (pool.hasRelay('ws://localhost:8008') && relay != 'ws://localhost:8008') {
        pool.getRelays()['ws://localhost:8008'].publish(evt)
    }

    switch (evt.kind) {
        case 0:
            handleMetadata(evt, relay)
            break
        case 1:
            feedQueue.push({ textnote: evt, url: relay })
            if (feedQueueTimer === null) {
                feedQueueTimer = setInterval(handleTextNote, 500)
            }
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

    }
}


