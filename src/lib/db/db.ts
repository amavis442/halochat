import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread'

/**
 * @see https://github.com/jlongster/absurd-sql
 */
let worker = new Worker(new URL('./db.worker.ts', import.meta.url))
initBackend(worker)


const hub = {}
worker.onmessage = ev => {
    let { id, success, error, data, stream, type, notice } = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
  
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
    worker.postMessage(JSON.stringify({id, name, args}))
    return new Promise((resolve, reject) => {
      hub[id] = {resolve, reject}
    })
  }
