import { log } from './lib/util/misc'

postMessage('London speaking here')

onmessage = (ev: MessageEvent) => {
    log('Message received from main script');
    //const workerResult = `Result: ${ev.data[0] * ev.data[1]}`;
    log('Posting message back to main script');
    //postMessage(workerResult);
    log('Received: ', ev.data)
    if (ev.data.msg == 'getUsers') {
        postMessage('getting Users boss')
    }
}
