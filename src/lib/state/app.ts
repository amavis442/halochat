import { get, writable, type Writable } from 'svelte/store'
import { users, annotateUsers, formatUser, initUser } from '../stores/users'
import { now } from "../util/time"
import { find } from "../util/misc"
import { uniq, uniqBy, prop } from 'ramda'
import type { User, TextNote, Reaction, Account } from './types'
import type { Event, Filter, Relay, Sub } from 'nostr-tools'
import { pool, getData, waitForOpenConnection, published } from './pool'
import { setLocalJson, getLocalJson, setting } from '../util/storage'
import { getRootTag, getReplyTag, getLastETag } from '../util/tags';
import { log } from '../util/misc';
import { blocklist } from '../stores/block'
import { account } from '../stores/account'
import { dbGetMetaEvent, dbSave } from '../../db'
import type Text from '../partials/Text.svelte'

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
        .then(() => {
            let $users = get(users)
            $users.forEach((user: User) => {
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
    let $users = get(users)
    let user = $users.find(u => u.pubkey == pubkey)
    if (user && user.refreshed > now() - 60 * 30) {
        return user
    }

    let filter: Filter = {
        kinds: [0],
        authors: [pubkey]
    }
    return getData([filter])
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
export async function fetchUsers(pubkeys: Array<string>, relay: string): Promise<void> {
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
    return getData([filter], "fetchUsers")
        .then((fetchResultUsers: Array<Event>) => {
            for (let i = 0; i < pubkeys.length; i++) {
                let user: User = initUser(pubkeys[i], relay)
                if (fetchResultUsers.length) {
                    let evt: Event = fetchResultUsers.find(e => e.pubkey == pubkeys[i])
                    if (evt) {
                        user = formatUser(evt, relay)
                    } else {
                        user = initUser(pubkeys[i], relay)
                    }
                }
                annotateUsers(user)
            }
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

function initNote(note: TextNote | null, relay: string) {
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

    let user = $users.find(u => u.pubkey == note.pubkey);
    if (user != undefined) note.user = user;
    if (user == undefined || !user) {// No user but we need a placeholder with a reference
        let dummyUser = initUser(note.pubkey, relay);
        $users.push(dummyUser)
        user = $users.find(u => u.pubkey == note.pubkey);
        if (!user) {
            throw new Error('Could not create user and find it grrr ' + JSON.stringify(dummyUser) + '\n for note \n' + JSON.stringify(note) + '\n Users: ' + JSON.stringify($users))
        }
        note.user = user;
    }

    if (!note?.user) note.user = initUser(note.pubkey, relay)
    if (!note?.replies) note.replies = []
    if (!note?.downvotes) note.downvotes = 0
    if (!note?.upvotes) note.upvotes = 0
    if (!note?.reactions) note.reactions = []
    if (!note?.relays) note.relays = []
    if (!note?.tree) note.tree = 0 // rootnote

    if (!note?.user) {
        throw new Error('Still no user placeholder')
    }
}

async function placeHolderUser(note: TextNote, relay: string) {

    let user: User = $users.find(u => u.pubkey == note.pubkey)
    if (user) {
        note.user = user
        return note
    }

    let evt: Event = await dbGetMetaEvent(0, note.pubkey)
    if (!user) user = initUser(evt.pubkey, relay)
    if (evt) {
        user = formatUser(evt, relay)
    }
    annotateUsers(user)
    user = $users.find(u => u.pubkey == note.pubkey)
    note.user = user // Need the pointer/ref to this user
    return note
}

async function handleTags(note: TextNote) {
    let $feedStack = get(feedStack)
    let tags = note.tags.filter(t => t[0] == 'e')

    // Is root
    if (tags.length == 0) {
        let user = $users.find(u => u.pubkey == note.pubkey)
        if (user) note.user = user
        if (!user) await placeHolderUser(note, '')

        /* For later...
        let filter = {kinds: [1], '#e': [note.id]}
        await getData([filter]).then((results: Array<Event>) => {

        })
        */
        return note
    }

    if (tags.length > 0) {
        let rootTag = getRootTag(tags)
        let replyTag = getReplyTag(tags)

        // Is reply to root
        if (rootTag.length > 0 && replyTag.length > 0 && rootTag[1] && replyTag[1] && rootTag[1] == replyTag[1]) {
            let rootNote = $feedStack[rootTag[1]] || null
            if (rootNote) {
                note.tree = (rootNote.tree ? rootNote.tree : 0) + 1
                if (!rootNote.replies.find(r => r.id == note.id) && rootNote.id != note.id) {
                    let user = $users.find(u => u.pubkey == note.pubkey)
                    if (user) note.user = user
                    if (!user) await placeHolderUser(note, '')
                    rootNote.replies.push(note)
                }
            }

            if (!rootNote) { // find rootNote
                let filter: Filter = { kinds: [1], 'ids': [rootTag[1]] }
                return await getData([filter])
                    .then((results: Array<Event>) => {
                        if (results && results.length) {
                            let item: TextNote = results[0] // This should be the root of the thread
                            initNote(item, '')
                            $feedStack[item.id] = item
                            rootNote = $feedStack[item.id]
                            note.tree = (rootNote.tree ? rootNote.tree : 0) + 1
                            if (!rootNote.replies.find((r: TextNote) => r.id == note.id)) {
                                let user = $users.find(u => u.pubkey == note.pubkey)
                                if (user) note.user = user
                                if (!user) placeHolderUser(note, '')
                                rootNote.replies.push(note)
                            }
                        }
                    })
            }
        }

        //Is reply to reply
        if (rootTag.length > 0 && replyTag.length > 0 && rootTag[1] && replyTag[1] && rootTag[1] != replyTag[1]) {
            let rootNote = $feedStack[rootTag[1]] || null
            if (rootNote && rootNote.replies && rootNote.replies.length) { // Check if it has children to add this reply to
                let replyNote: TextNote | null = $feedStack[replyTag[1]] || [] // ReplyTag is the parent of the current note processed
                if (replyNote) {
                    note.tree = (replyNote.tree ? replyNote.tree : 0) + 1
                    if (!replyNote.replies) replyNote.replies = []
                    if (!replyNote.replies.find(r => r.id == note.id) && replyNote.id != note.id) {
                        let user = $users.find(u => u.pubkey == note.pubkey)
                        if (user) note.user = user
                        if (!user) await placeHolderUser(note, '')
                        replyNote.replies.push(note)
                    }
                }
            }

            if (!rootNote) {
                let filter1: Filter = { kinds: [1], '#e': [rootTag[1]] }
                let filter2: Filter = { ids: [rootTag[1]], kinds: [1] }
                return await getData([filter1, filter2])
                    .then((results: Array<Event>) => {
                        if (results && results.length) {
                            feedStack.update(data => {
                                for (let i = 0; i < results.length; i++) {
                                    let item: Event = results[i]
                                    if (!data[item.id] && item.kind == 1) {
                                        initNote(item, '')
                                        data[item.id] = item
                                    }
                                }
                                return data
                            })
                        }
                        return results;
                    })
                    .then((results: Array<Event>) => {
                        let rootNote: TextNote = $feedStack[rootTag[1]]
                        if (!rootNote) return; // No starting point found for this thread
                        initNote(rootNote, '')

                        let user = $users.find(u => u.pubkey == rootNote.pubkey)
                        if (user) rootNote.user = user
                        if (!user) placeHolderUser(rootNote, '')

                        /**
                         * @see https://typeofnan.dev/an-easy-way-to-build-a-tree-with-object-references/
                         */
                        for (let i = 0; i < results.length; i++) {
                            let el: TextNote = results[i]
                            if (el.kind != 1 || el.id == rootNote.id) {
                                continue
                            }

                            let note: TextNote = $feedStack[el.id]
                            let replyTag = getReplyTag(note.tags) //The parent of current note

                            let user = $users.find(u => u.pubkey == note.pubkey)
                            if (user) note.user = user
                            if (!user) placeHolderUser(note, '')

                            // Use our mapping to locate the parent element in our data array
                            let parentEl: TextNote = rootNote
                            if (replyTag.length > 0) {
                                console.log('We have a replyTag ', replyTag, ' Feedstack result is ', $feedStack[replyTag[1]])
                                parentEl = $feedStack[replyTag[1]]
                                if (!parentEl) return // Even when we asked for all the data, this id is not present in the stack so we ignore it.
                                initNote(parentEl, '')
                            }

                            if (import.meta.env.DEV) {
                                el.content += "\n\n ** 5 ** Tree: " + el.tree + '\n\n Tag length: ' + el.tags.length + "\n Note id: " + el.id + "\n Tag content: " + JSON.stringify(el.tags)
                            }

                            if (!parentEl?.replies) {
                                console.log('ParentEl has no replies property: ', parentEl)
                                parentEl.replies = []
                            }
                            // Add our current el to its parent's `children` array
                            parentEl.replies = [...(parentEl?.replies || []), note];
                        };

                        rootNote.tree = 0
                        const tree = (node: TextNote) => {
                            if (node.replies.length > 0) {
                                for (let i = 0; i < node.replies.length; i++) {
                                    let child = node.replies[i]
                                    child.tree = node.tree + 1
                                    if (child.replies.length > 0) {
                                        for (let n = 0; n < child.replies.length; n++) {
                                            tree(child.replies[n])
                                        }
                                    }
                                }
                            }
                        }
                        tree(rootNote)
                    })
            }
        }
    }
}

async function handleUser(note: TextNote, relay?: string): Promise<void> {
    if (!note?.user) initNote(note, '')
    let foundUser: User = $users.find((u: User) => u.pubkey == note.pubkey && u.name != u.pubkey)
    if (!foundUser) {
        let evt: Event = await dbGetMetaEvent(0, note.pubkey)
        if (evt) {
            foundUser = initUser(evt.pubkey, relay)
            foundUser = formatUser(evt, relay)
            annotateUsers(foundUser)
        } else {
            fetchUsers([note.pubkey], relay);
        }
    }
    if (foundUser) {
        note.user = foundUser;
    }
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
    if (evt.content.match(/free\ sats/gmi)) return true
    if (evt.content.match(/wechat/gmi)) return true
    if (evt.content.match(/lemony/gmi)) return true
    if (evt.content.match(/chatgpt/gmi)) return true

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

    if (blockNote(evt)) return
    if (evt.kind != 1) return

    let note: TextNote = evt
    initNote(note, relay)
    //note.relays.push(relay)

    if ($feedStack[evt.id]) {
        log('handleTextNote: Already added this input ', evt)
        return
    }

    $feedStack[evt.id] = note
    if (!note?.user || !$feedStack[evt.id]?.user) {
        throw new Error('handleTextNote(462): note has no user attached to it which sucks \n\n' + JSON.stringify(note) + '\n\n' + JSON.stringify($feedStack[evt.id]))
    }

    return await
        handleTags(note)
            .then(() => {
                let $feed = get(feed)
                Object.values($feedStack).forEach((item: TextNote) => {
                    let tags = item.tags.filter(t => t[0] == 'e')
                    if (tags.length == 0) {
                        if (!$feed.find(d => d.id == item.id) && !$mute.find(m => m == item.id) && !$blocklist.find(b => b.pubkey == item.pubkey)) {
                            item.dirty = true
                            $feed.push(item)
                        }
                    }
                })
            })
            .then(() => handleDeletions(note))
            .then(() => handleReactions(note)) // Can be very slow
            .then(() => handleMentions(note))
            .then(() => handleUser(note, relay)) // Can be very slow
            .then(() => { console.debug('Done handle note'); feed.update((data) => data) })

}

async function handleMentions(note: TextNote): Promise<void> {
    if (!note || !note.content) {
        log('handleMentions:: This should never ever happen, but it did', note.id)
        return
    }

    let reg = /#\[[0-9]+\]/img
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

/**
 * Got a live kind 7 event and lookup a note to add this too
 * @param evt 
 * @param relay 
 * @returns 
 */
async function handleReaction(evt: TextNote, relay: string) {
    if (evt.kind != 7) return

    let lastTag = getLastETag(evt.tags)
    if (!lastTag) {
        log('handleReaction:: Misformed tags.. ignore it', 'Tags:', evt.tags, 'Event:', evt)
        return false
    }
    initNote(evt, relay)

    feedStack.update(data => {
        let note: TextNote = data[lastTag[1]] || null
        if (note && note.reactions && !note.reactions.find(r => r.id == evt.id)) {

            if (evt.content == '+' || evt.content == "") note.upvotes = note.upvotes + 1
            if (evt.content == '-') note.downvotes = note.downvotes + 1
            evt.relays.push(relay)
            note.reactions.push(evt)
        }
        return data
    })
    feed.update((data) => data) // Hope this will trigger an subscribe trigger event and updates the view
}

/**
 * Look up the reactions for this textnote.
 * 
 * @param note
 * @returns 
 */
async function handleReactions(note: TextNote) {
    if (note.kind != 1) return

    let filter: Filter = {
        kinds: [7],
        '#e': [note.id]
    }

    return await getData([filter], 'getReactions' + now())
        .then((results: Array<Reaction>) => {
            if (!note.upvotes) note.upvotes = 0
            if (!note.downvotes) note.downvotes = 0

            for (let i = 0; i < results.length; i++) {
                let item: Reaction = results[i]
                if (item.kind != 7) continue;
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
            return note
        })
}

console.log('Complete blocklist is : ', $blocklist, $blocklist.find((b: { pubkey: string, added: number }) => b.pubkey == "4a226bb248f3b03eb8d715adffaafafd9cddc855bfce79f3fb991e2797600234")? true:false)
function blockNote(note): boolean {
    let $account = get(account)
    let $blocklist = get(blocklist)
    
    if ($account.pubkey != note.pubkey) {
        let found:boolean = $blocklist.find((b: { pubkey: string, added: number }) => b.pubkey == note.pubkey) ? true:false
        if (found) {
            console.log('Block Note on pubkey: ', note)
            return true
        }
        if (blockText(note)) {
            console.log('Block Note on text: ', note)
            return true
        }
    }
    if (note.name && note.name.match(/BLOCK|BAN/gmi)) {
        console.log('Block Note on tag: ', note, $blocklist)
        return true
    }
    return false
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

async function handleDeletions(note: TextNote) {
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
    filters: Array<Filter>
    subs: { [key: string]: Sub } = {}
    id: string
    timer: string | number | NodeJS.Timeout

    constructor(filters: Array<Filter>, id?: string) {
        this.filters = filters
        if (!id) {
            this.id = 'listener' + now()
        } else {
            this.id = id
        }
        this.timer = null
    }
    async start() {
        // Cleanup first
        feedStack.set({})
        feedQueue = []
        feed.set([])
        for (const [url, sub] of Object.entries(this.subs)) {
            sub.unsub()
            console.log(`Stop listening to relay ${url} by unsubscribe to events and eose`)
        }

        await pool.start()
        for (const [url, relay] of Object.entries(pool.getRelays())) {
            if (relay.status !== 1) {
                try {
                    await waitForOpenConnection(relay)
                } catch (err) { console.error(err) }
            }
            console.log(`Start listening to relay ${url} with listener subscribe id ${this.id} and filter(s)`, this.filters)

            this.subs[url] = relay.sub(this.filters, { id: this.id })

            this.subs[url].on('event', (event: Event) => {

                if ($account.pubkey != event.pubkey) {
                    if ($blocklist.find((b: { pubkey: string, added: number }) => b.pubkey == event.pubkey)) {
                        return
                    }
                    if (blockText(event)) {
                        return
                    }
                }
                onEvent(event, url)
            })

            this.subs[url].on('eose', () => {
                log(`Eose from ${url}`)
            })
        }

        this.timer = setInterval(isAlive, 1000 * 60 * 5) // check every 5 minutes

        // Own events are first class.
        published.subscribe((data: { note: TextNote, relay: string }) => {
            if (data && data.note) {
                console.debug('Incomming Publish ... ', data.note, data.relay)
                switch (data.note.kind) {
                    case 0:
                        handleMetadata(data.note, data.relay)
                        break;
                    case 1:
                        feedQueue.unshift({ textnote: data.note, url: data.relay })
                        handleTextNote()
                        break;
                    case 7:
                        handleReaction(data.note, data.relay)
                        break;
                }
            }
        })

        blocklist.subscribe((all) => {
            feedQueue = feedQueue.filter(item => {
                if ($blocklist.find((b: { pubkey: string, added: number }) => b.pubkey == item.textnote.pubkey)) {
                    return false
                }
                return true
            })
        })
    }
    stop() {
        for (const [url, sub] of Object.entries(this.subs)) {
            sub.unsub()
            console.log(`Stop listening to relay ${url} by unsubscribe to events and eose`)
        }
        pool.close()
        clearInterval(this.timer)

        feedQueue = []
        clearInterval(feedQueueTimer)
        feedQueueTimer = null
        feedStack.set({})
        feed.set([])
    }
}

export let feedQueue: Array<{ textnote: Event, url: string }> = []
let feedQueueTimer = null

function handleFeedQueueBlockAndMute() {
    for (let i = 0; i < feedQueue.length; i++) {
        let note: TextNote = feedQueue[i].textnote
        if (blockNote(note)) {
            delete feedQueue[i]
            continue
        }
    }
}


export let lastSeen = writable(getLocalJson(setting.Lastseen) || now() - 60 * 60)
lastSeen.subscribe(value => {
    setLocalJson(setting.Lastseen, value)
})

export async function onEvent(evt: Event, relay: string) {

    if (pool.hasRelay('ws://localhost:8008') && relay != 'ws://localhost:8008') {
        pool.getRelays()['ws://localhost:8008'].publish(evt)
    }

    if (!feedQueueTimer) {
        feedQueueTimer = setInterval(handleTextNote, 3000)
    }

    switch (evt.kind) {
        case 0:
            handleMetadata(evt, relay)
            await dbSave(evt, relay)
            break
        case 1:
            if (evt.pubkey != $account.pubkey && !blockNote(evt)) {
                feedQueue.push({ textnote: evt, url: relay })
                handleFeedQueueBlockAndMute();
            }
            break
        case 3:
            await dbSave(evt, relay)
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
        case 10001:
            await dbSave(evt, relay)
            break;
        default:

    }
}


