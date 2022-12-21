import { log } from './lib/util/misc'

const worker = new Worker("./src/note.worker.ts", { "type": "module" });

worker.onmessage = function (e) {
    log('info', e.data)
};

export function runWorker() {
    log('info', 'Running worker')

    worker.postMessage({ 'msg': 'getUsers' })
}
export { }
