import initSqlJs from '@jlongster/sql.js';
import { SQLiteFS } from 'absurd-sql';
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';
import sqlWasm from '@jlongster/sql.js/dist/sql-wasm.wasm?url'
import { debounce } from 'throttle-debounce';
import type { Event } from 'nostr-tools';

async function run() {
    let queue = []
    self.onmessage = function (ev) {
        queue.push(ev)
    }

    let SQL = await initSqlJs({ locateFile: () => sqlWasm });
    let sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
    SQL.register_for_idb(sqlFS);

    SQL.FS.mkdir('/nostr');
    SQL.FS.mount(sqlFS, {}, '/nostr');

    const path = '/nostr/nostr.sqlite';
    if (typeof SharedArrayBuffer === 'undefined') {
        let stream = SQL.FS.open(path, 'a+')
        await stream.node.contents.readIfFallback()
        SQL.FS.close(stream)
    }

    let db = new SQL.Database(path, { filename: true });
    db.exec(`
        PRAGMA page_size=8192;
        PRAGMA journal_mode=MEMORY;
        PRAGMA cache_size=5000;
        CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, pubkey TEXT, kind INTEGER, created_at INTEGER, content TEXT, tags_full TEXT, sig TEXT);
        CREATE TABLE IF NOT EXISTS tags (event_id TEXT, tag TEXT, value TEXT, UNIQUE(event_id, tag, value));
        CREATE TABLE IF NOT EXISTS seen (event_id TEXT, relay TEXT, UNIQUE(event_id, relay));
        CREATE TABLE IF NOT EXISTS users (pubkey TEXT PRIMARY KEY, relay TEXT, name TEXT, about TEXT, picture TEXT, content TEXT, updated_at INTEGER);
        CREATE INDEX IF NOT EXISTS events_by_kind ON events (kind, created_at);
        CREATE INDEX IF NOT EXISTS events_by_pubkey_kind ON events (pubkey, kind, created_at);
        CREATE UNIQUE INDEX IF NOT EXISTS tags_primary ON tags (event_id, tag);
        VACUUM;
    `);

    function handleMessage(ev) {
        let { name, args, id } = JSON.parse(ev.data)

        let reply: { id: string, success?: boolean, error?: string, data?: any } = { id }
        try {
            let data = methods[name](...args)
            reply.success = true
            reply.data = data
        } catch (err) {
            reply.success = false
            reply.error = err.message
        }

        postMessage(JSON.stringify(reply))
    }

    const methods = {

        // general function for saving an event, with granular logic for each kind
        //
        eventInsertStmt: db.prepare(
            `INSERT OR IGNORE INTO events (id, pubkey, kind, created_at, content, tags_full, sig) VALUES (:id, :pubkey, :kind, :created_at, :content, :tags_full, :sig)`
        ),
        tagsInsertStmt: db.prepare(
            `INSERT OR IGNORE INTO tags (event_id, tag, value) VALUES (:event_id, :tag, :value)`
        ),
        seenInsertStmt: db.prepare(
            `INSERT OR IGNORE INTO seen (event_id, relay) VALUES (:event_id, :relay)`
        ),
        getOldStmt: db.prepare(
            `SELECT id FROM events WHERE kind = :kind AND pubkey = :pubkey`
        ),
        deleteFromSeenStmt: db.prepare(`DELETE FROM seen WHERE event_id = :id`),
        deleteFromTagsStmt: db.prepare(`DELETE FROM tags WHERE event_id = :id`),
        deleteFromEventsStmt: db.prepare(`DELETE FROM events WHERE id = :id`),
        saveQueue: {},
        dbSave(event: Event, relay: string) {
            if (event.id in this.saveQueue) {
                this.saveQueue[event.id].relays[relay] = true
            } else {
                this.saveQueue[event.id] = { event, relays: { [relay]: true } }
            }
            this.actuallySaveEventually()
        },
        actuallySave() {
            let events = Object.values(this.saveQueue)
            this.saveQueue = {}
            try {
                events.forEach(({ event, relays }: { event: Event, relays: Array<string> }) => {
                    if (
                        event.kind === 0 ||
                        event.kind === 3 ||
                        (event.kind >= 10000 && event.kind < 20000)
                    ) {
                        // is replaceable
                        let previous = this.dbGetMetaEvent(event.kind, event.pubkey)

                        // if this is replaceable and not the newest, abort here
                        if (previous && previous.created_at > event.created_at) {
                            return
                        }

                        // otherwise delete the old stuff for this kind and pubkey
                        this.getOldStmt.bind({ ':kind': event.kind, ':pubkey': event.pubkey })
                        while (this.getOldStmt.step()) {
                            let [id] = this.getOldStmt.get()
                            this.deleteFromSeenStmt.bind({ ':id': id })
                            this.deleteFromSeenStmt.step()
                            this.deleteFromSeenStmt.reset()
                            this.deleteFromTagsStmt.bind({ ':id': id })
                            this.deleteFromTagsStmt.step()
                            this.deleteFromTagsStmt.reset()
                            this.deleteFromEventsStmt.bind({ ':id': id })
                            this.deleteFromEventsStmt.step()
                            this.deleteFromEventsStmt.reset()
                        }
                        this.getOldStmt.reset()
                    }

                    // proceed to add
                    this.eventInsertStmt.run({
                        ':id': event.id,
                        ':pubkey': event.pubkey,
                        ':kind': event.kind,
                        ':created_at': event.created_at,
                        ':content': event.content,
                        ':tags_full': JSON.stringify(event.tags),
                        ':sig': event.sig
                    })
                    event.tags
                        .filter(tag => tag.length >= 2)
                        .filter(tag => tag[0].length === 1)
                        .forEach(tag =>
                            this.tagsInsertStmt.run({
                                ':event_id': event.id,
                                ':tag': tag[0],
                                ':value': tag[1]
                            })
                        )
                    Object.keys(relays).forEach(relay =>
                        this.seenInsertStmt.run({ ':event_id': event.id, ':relay': relay })
                    )
                })
            } catch (err) {
                this.deleteFromSeenStmt.reset()
                this.deleteFromTagsStmt.reset()
                this.deleteFromEventsStmt.reset()
                this.getOldStmt.reset()
                console.log('FAILED TO INSERT', err)
            }
        },

        // db queries
        // ~
        getMentionsStmt: db.prepare(`
          SELECT * FROM events
          INNER JOIN tags ON tags.event_id = events.id
          WHERE tags.tag = 'p' AND tags.value = :ourPubKey
            AND kind = 1
            AND created_at > :since
            AND created_at < :until
            LIMIT :limit
        `),
        dbGetMentions(
            ourPubKey,
            limit = 40,
            since = Math.round(Date.now() / 1000) - 60 * 60 * 24 * 360,
            until = Math.round(Date.now() / 1000)
        ) {
            try {
                this.getMentionsStmt.bind({ ':ourPubKey': ourPubKey, ':since': since })
                var events = []
                while (this.getMentionsStmt.step()) {
                    events.push(eventFromRow(this.getMentionsStmt.get()))
                }
                this.getMentionsStmt.reset()
                return events
            } catch (err) {
                this.getMentionsStmt.reset()
                return []
            }
        },

        getUnreadNotificationsCountStmt: db.prepare(`
          SELECT count(*) FROM events
          INNER JOIN tags ON tags.event_id = events.id
          WHERE tags.tag = 'p' AND tags.value = :ourPubKey
            AND kind = 1
            AND created_at > :since
        `),

        dbGetUnreadNotificationsCount(ourPubKey: string, since: number) {
            let results = this.getUnreadNotificationsCountStmt.get({
                ':ourPubKey': ourPubKey,
                ':since': since
            })
            this.getUnreadNotificationsCountStmt.reset()
            return results.length > 0 ? results[0] : 0
        },

        getMetaEventStmt: db.prepare(`
          SELECT * FROM events
          WHERE pubkey = :pubkey
            AND kind = :kind
            ORDER BY created_at DESC
            LIMIT 1
        `),
        dbGetMetaEvent(kind: number, pubkey: string) {
            try {
                let event = eventFromRow(
                    this.getMetaEventStmt.get({ ':kind': kind, ':pubkey': pubkey })
                )
                this.getMetaEventStmt.reset()
                return event
            } catch (err) {
                this.getMetaEventStmt.reset()
                return null
            }
        },

        getMetaEventSeenStmt: db.prepare(`
          SELECT relay FROM seen
          WHERE event_id IN (
            SELECT id FROM events
              WHERE pubkey = :pubkey
              AND kind = :kind
              ORDER BY created_at DESC
              LIMIT 1
          )
        `),
        dbGetMetaEventSeen(kind: number, pubkey: string) {
            try {
                this.getMetaEventSeenStmt.bind({ ':kind': kind, ':pubkey': pubkey })
                var relays = []
                while (this.getMetaEventSeenStmt.step()) {
                    relays.push(this.getMetaEventSeenStmt.get()[0])
                }
                this.getMetaEventSeenStmt.reset()
                return relays
            } catch (err) {
                this.getMetaEventSeenStmt.reset()
                return []
            }
        },

        dbExec(sql: string, params = []) {
            return db.exec(sql, params)
        },
    }

    methods.actuallySaveEventually = debounce(15000, methods.actuallySave);

    // db is initialized now, execute all in the query and run them immediately from here onwards
    self.onmessage = handleMessage
    queue.forEach(ev => handleMessage(ev))
    queue = null
}

function eventFromRow(row: Array<any>) {
    return {
        id: row[0],
        pubkey: row[1],
        kind: row[2],
        created_at: row[3],
        content: row[4],
        tags: JSON.parse(row[5]),
        sig: row[6]
    }
}

run()
