const worker = new Worker("./src/note.worker.ts", { "type": "module" });

worker.onmessage = function (e) {
    console.info(e.data)
};

export function runWorker() {
    console.info('Running worker')

    worker.postMessage({'msg':'getUsers'})
}
export { }
