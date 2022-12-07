<script lang="ts">
import {
    relays,
    eventListener
} from '../state/pool'
import {
    uniqBy,
    prop,
} from 'ramda'
import {
    onMount
} from 'svelte'
import {
    writable
} from 'svelte/store'

import { processEvent, initData } from '../state/app'
import Note from './Note.svelte'

const noteData = writable([])

function addRelay(url: string) {
    relays.update(data => {
        const result = data.find((value: string) => value.includes(url))
        if (!result) {
            return [...data, url]
        }
        return data
    })
}

//localStorage.setItem('halonostr/users', '')
//$users = []

onMount(async () => {
    const eventData = await initData()
    const myNotes = await processEvent(eventData)
    noteData.update($noteData => uniqBy(prop('id'), $noteData.concat(myNotes)))
    eventListener(processEvent)
});
</script>

<main>
    <div class="w-full px-5 flex flex-col justify-center">
  
            {#each $noteData as note }
            <Note note={note} />
            {/each}
    </div>
</main>
