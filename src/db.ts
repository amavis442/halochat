import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread';
import type { Event } from 'nostr-tools';

const worker = new Worker(new URL('db.worker.ts', import.meta.url), { "type": "module" });
const hub = {}

initBackend(worker);

worker.onmessage = ev => {
    try {
        JSON.parse(ev.data)
    } catch (e) {
        console.info(e, ev.data) // absurd-sql does something it should not.
        return 
    }

    let { id, success, error, data } = JSON.parse(ev.data)
    if (!success) {
        hub[id].reject(new Error(`${id}: ${error}`))
        delete hub[id]
        return
    }

    if (data) console.debug('🖴', id, '->', data)
    hub[id]?.resolve?.(data)
    delete hub[id]
}

function call(name, args) {
    let id = name + ' ' + Math.random().toString().slice(-4)
    console.debug('🖴', id, '<-', args)
    worker.postMessage(JSON.stringify({ id, name, args }))
    return new Promise((resolve, reject) => {
        hub[id] = { resolve, reject }
    })
}

export async function dbSave(event, relay) {
    return call('dbSave', [event, relay])
}

export async function dbGetMentions(ourPubKey, limit = 40, since, until) {
    return call('dbGetMentions', [ourPubKey, limit, since, until])
}

export async function dbGetUnreadNotificationsCount(ourPubKey, since) {
    return call('dbGetUnreadNotificationsCount', [ourPubKey, since])
}

export async function dbGetMetaEvent(kind, pubkey): Promise<Event> {
    return call('dbGetMetaEvent', [kind, pubkey])
}

export async function dbGetMetaEventSeen(kind, pubkey) {
    return call('dbGetMetaEventSeen', [kind, pubkey])
}

export async function dbExec(sql) {
    return call('dbExec', [sql])
}

export function runWorker() {
    console.debug('worker', 'Running worker')

    //worker.postMessage([ {'msg': 'getUsers'} ])
}
