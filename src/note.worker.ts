import { prop, sort, descend } from "ramda";
import type { Event, User, Filter, Note, Reaction } from './lib/state/types'
import { now } from "./lib/util/time"
import { log } from './lib/util/misc'

async function getUsers() {
    //Getting a bunch of users
    let filter: Filter = {
        kinds: [0],
        limit: 100
    }

    //let result = await channels.getter.all(filter)
    let result = []
    if (result) {
        let users = []
        result.forEach(r => {

            let unkownUser = {
                pubkey: '',
                name: '',
                about: '',
                picture: 'profile-placeholder.png',
                content: '',
                refreshed: now(),
                relays: ''
            }

            const user = {
                unkownUser,
                ...JSON.parse(r.content),
                content: r.content,
                pubkey: r.pubkey
            }

            users.push(user)
            //addUser(user)
        })

        postMessage(users)
    }
}

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
