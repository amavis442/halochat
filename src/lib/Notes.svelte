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
//import { getLocalJson, setLocalJson } from './util/misc'

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
    <div class="w-full px-5 flex flex-col justify-between">
        <div class="flex flex-col mt-5">
            {#each $n as note,i  }
            {#if i % 2 }
            <div class="flex justify-end mb-4">
                <div
                    class="mr-2 py-3 px-4 bg-light rounded-bl-3xl rounded-tl-3xl rounded-tr-xl text-white text-right"
                    >
                    <div class="pr-4 text-right px-2">
                        <small class="text-white">{note.user? (note.user.name ? note.user.name : note.pubkey) : note.pubkey}</small>
                    </div>
                    <span class="pr-4">{ note.content }</span>
                    <div class="pr-4 text-right px-2">
                        <small class="text-gray-500">{ getTime(note.created_at) }</small>
                    </div>
                </div>
                <img
                    src="{ note.user && note.user.picture ? note.user.picture : 'profile-placeholder.png' }"
                    class="object-cover h-8 w-8 rounded-full"
                    alt="{ note.user ? note.user.about : note.pubkey }"
                    title="{ note.user ? note.user.name : note.pubkey }"
                    />
            </div>
            {:else}
                <div class="flex justify-start mb-4">
                    <img
                    src="{ note.user && note.user.picture ? note.user.picture : 'profile-placeholder.png' }"
                    class="object-cover h-8 w-8 rounded-full"
                    alt="{ note.user ? note.user.about : note.pubkey }"
                    title="{ note.user ? note.user.name : note.pubkey }"
                    />
                <div
                    class="mr-2 py-3 px-4 bg-blue rounded-bl-3xl rounded-tl-3xl rounded-tr-xl text-white text-right"
                    >
                    <div class="pr-4 text-right px-2">
                        <small class="text-white">{note.user? (note.user.name ? note.user.name : note.pubkey) : note.pubkey}</small>
                    </div>
                    <div class="pr-4 space-x-4">{ note.content }</div>
                    <div class="pr-4 text-right px-2">
                        <small class="text-gray-500">{ getTime(note.created_at) }</small>
                    </div>
                </div>

            </div>
            {/if}
            {/each}
        </div>
    </div>
</main>
