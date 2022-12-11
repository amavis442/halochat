import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread'
//import TestWorker from './db.worker.ts'
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
 * @see https://vitejs.dev/guide/features.html#webassembly
 */
let worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: "module" })
/**
 * @see https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Instance
 */
WebAssembly.compileStreaming(fetch("sql-wasm.wasm")).then((mod) =>
  worker.postMessage(mod)
);
initBackend(worker)


const hub = {}
worker.onmessage = ev => {
    let { id, success, error, data } = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data

    if (!success) {
        hub[id].reject(new Error(`${id}: ${error}`))
        delete hub[id]
        return
    }

    if (data) console.debug('🖴', id, '->', data)
    hub[id]?.resolve?.(data)
    delete hub[id]
}

/**
 * Communicate with the worker thread
 * 
 * @param name 
 * @param args 
 * @returns 
 */
function call(name, args) {
    let id = name + ' ' + Math.random().toString().slice(-4)
    console.debug('🖴', id, '<-', args)
    
    worker.postMessage(JSON.stringify({ id, name, args }))

    return new Promise((resolve, reject) => {
        hub[id] = { resolve, reject }
    })
}


/**
 * Api calls to database 
 */


export async function dbSave(event, relay) {
    return call('dbSave', [event, relay])
}
export async function dbGetMetaEvent(kind, pubkey) {
    return call('dbGetMetaEvent', [kind, pubkey])
}
export async function dbExec(sql) {
    return call('dbExec', [sql])
}
