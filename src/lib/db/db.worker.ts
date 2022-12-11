/**
 * @see https://github.com/monlovesmango/astral/blob/master/src/query.worker.js
 * @see https://github.com/fiatjaf/branle/blob/master/src/worker-db.js
 */
import initSqlJs from '@jlongster/sql.js'
import { SQLiteFS } from 'absurd-sql'
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend'
import sqlWasm from '@jlongster/sql.js/dist/sql-wasm.wasm'
import type { Event } from '../state/types'
import debounce from 'throttle-debounce'

let db: any = null
let currentBackendType = 'idb'
let cacheSize = 2000
let pageSize = 8192
const dbName = `events.sqlite`
const path = `/nostr/${dbName}`
let _sql: any = null
let active = true
let saving = false

let idbBackend = new IndexedDBBackend(() => {
    console.error('Unable to write!')
})


/**
 * 
 * @param msg Should be a toaster
 */
function output(msg) {
    // self.postMessage({ output: msg })
    console.log(msg)
}

function createTables(db, output = console.log) {
    console.log('Creating tables and indexes', db)
    db.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, pubkey TEXT, kind INTEGER, created_at INTEGER, content TEXT, tags_full TEXT, sig TEXT);
        CREATE TABLE IF NOT EXISTS tags (event_id TEXT, tag TEXT, value TEXT, UNIQUE(event_id, tag, value));
        CREATE TABLE IF NOT EXISTS seen (event_id TEXT, relay TEXT, UNIQUE(event_id, relay));
        CREATE INDEX IF NOT EXISTS events_by_kind ON events (kind, created_at);
        CREATE INDEX IF NOT EXISTS events_by_pubkey_kind ON events (pubkey, kind, created_at);
        CREATE UNIQUE INDEX IF NOT EXISTS tags_primary ON tags (event_id, tag);
        COMMIT;`
    )
    output('Done')
}

async function initDb() {
    if (_sql == null) {
        _sql = await initSqlJs({ locateFile: () => sqlWasm })
        let sqlFS = new SQLiteFS(db.FS, idbBackend)
        _sql.register_for_idb(sqlFS)
        if (typeof SharedArrayBuffer === 'undefined') {
            output(
                '<code>SharedArrayBuffer</code> is not available in your browser. Falling back.'
            )
        }

        _sql.FS.mkdir('/nostr')
        _sql.FS.mount(sqlFS, {}, '/nostr')
    }

    // Fallback
    if (typeof SharedArrayBuffer === 'undefined') {
        let stream = _sql.FS.open(path, 'a+')
        await stream.node.contents.readIfFallback()
        _sql.FS.close(stream)
    }

    db = new _sql.Database(path, { filename: true })
    db.run(`
    PRAGMA cache_size=-${cacheSize};
    PRAGMA journal_mode=MEMORY;
    PRAGMA page_size=${pageSize};
    VACUUM;
  `)
    output(`Opened ${dbName} (${currentBackendType}) cache size: ${cacheSize}`)

    createTables(db)
    return
}


function queryDb(sql) {
    let stmt = db.prepare(sql)
    let rows = []
    while (stmt.step()) {
        rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
}

function closeDb() {
    if (db) {
        output(`Closed db`)
        db.close()
        db = null
    }
}

const methods = {
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
    getMetaEventStmt: db.prepare(`
    SELECT * FROM events
    WHERE pubkey = :pubkey
      AND kind = :kind
      ORDER BY created_at DESC
      LIMIT 1
    `),
    deleteFromSeenStmt: db.prepare(`DELETE FROM seen WHERE event_id = :id`),
    deleteFromTagsStmt: db.prepare(`DELETE FROM tags WHERE event_id = :id`),
    deleteFromEventsStmt: db.prepare(`DELETE FROM events WHERE id = :id`),
    saveQueue: {},
    dbSave(event: Event, relay) {
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
            //@ts-ignore
            events.forEach(({ event, relays }) => {
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
    dbErase() {
        closeDb()

        let exists = true
        try {
            _sql.FS.stat(path)
        } catch (e) {
            exists = false
        }

        if (exists) {
            _sql.FS.unlink(path)
        }
        return
    },
    actuallySaveEventually() {
        debounce(this.actuallySave, 15000)
    }
}

async function handleMessage(ev) {
    let { name, args, id, stream, cancel } = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data

    var reply = { id }

    try {
        let data = await methods[name](...args)
        //@ts-ignore
        reply.success = true
        //@ts-ignore
        reply.data = data
    } catch (err) {
        //@ts-ignore
        reply.success = false
        //@ts-ignore
        reply.error = err.message
    }

    self.postMessage(JSON.stringify(reply))
}

async function run() {
    // db is not initialized, collect all requests in a queue
    let queue = []
    self.onmessage = function (ev) {
        queue.push(ev)
    }


    // initialize db
    if (db === null) await initDb()

    // db is initialized now, execute all in the query and run them immediately from here onwards
    self.onmessage = handleMessage
    queue.forEach(ev => handleMessage(ev))
    queue = null

    self.onmessage = handleMessage
    queue.forEach(ev => handleMessage(ev))
    queue = null
}

run()
