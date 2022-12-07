<script lang="ts">
import {
    getData,
    relays,
    eventListener
} from '../state/pool'
import {
    now,
    getTime
} from "../util/time"
import {
    uniqBy,
    prop,
    trim
} from 'ramda'
import {
    onMount
} from 'svelte'
import {
    get,
    writable
} from 'svelte/store'
import {
    users
} from '../stores/user'
import Note from './Note.svelte'

function addRelay(url: string) {
    relays.update(data => {
        const result = data.find((value: string) => value.includes(url))
        if (!result) {
            return [...data, url]
        }
        return data
    })
}
const blacklist = [
    '887645fef0ce0c3c1218d2f5d8e6132a19304cdc57cd20281d082f38cfea0072'
]
const n = writable([])
//localStorage.setItem('halonostr/users', '')
//$users = []
/**
 * Retrieves all pubkey from the event(s) and tries to get the user meta data for this event
 * @param data
 */
async function updateUserData(data: Array < any > ) {
    let pubKeys = []
    data.forEach((event: any) => {
        pubKeys.push(event.pubkey.toString());
    })

    const $users = get(users)
    pubKeys = pubKeys.filter(k => !$users[k])
    if (pubKeys.length) {
        let filter = {
            kinds: [0],
            authors: pubKeys,
        };
        const userData = await getData(filter)

        /**
         * Add metadata to user and tries to update the data in localstore
         * $users = writable = observable
         */
        users.update($users => {
            userData.forEach((e) => {
                $users[e.pubkey] = {
                    pubkey: e.pubkey,
                    ...$users[e.pubkey],
                    ...JSON.parse(e.content),
                    content: e.content,
                    refreshed: now()
                }
                const regex = new RegExp('(http(s?):)|([/|.|\w|\s])*\.(?:jpg|gif|png)');
                if (!regex.test($users[e.pubkey].picture)) {
                    $users[e.pubkey].picture = 'profile-placeholder.png'
                }
            })
            return $users
        })
    }
}

/**
 * Put note,user,replies and likes/dislikes together
 * @param event
 */
async function processEvent(event: any) {
    if (!Array.isArray(event)) {
        event = [event]
    }

    await updateUserData(event)

    let myNotes = []
    //merge user with their events
    noteData.forEach((note) => {
        if (!blacklist.includes(note.pubkey)) {
            switch (note.kind) {
                case 1:
                    const myNote = {
                        ...note,
                        user: $users[note.pubkey]
                    }
                    myNotes.push(myNote)
                    break;
            }
        }
    })
    myNotes.reverse()
    //$n = $n.concat(myNotes)
    n.update($n => uniqBy(prop('id'), $n.concat(myNotes)))
    //$n.reverse()
}

$relays = []
async function initData(): Promise < any > {
    // Get some events from 7 days with a max limit of 4000 records
    let filter = {
        kinds: [1, 5, 7],
        since: now() - 2 * 60 * 60 * 24, // Events from 2 days
        limit: 20, // Start of with 20 events and get more when needed (scrolling).
    };
    return getData(filter)
}

let noteData = []

onMount(async () => {
    addRelay('wss://relay.damus.io')
    addRelay('wss://nostr-relay.wlvs.space')

    noteData = await initData()
    await processEvent(noteData)
    eventListener(processEvent)
});
</script>

<main>
    <div class="w-full px-5 flex flex-col justify-center">
  
            {#each $n as note }
            <Note note={note} />
            {/each}
    </div>
</main>
