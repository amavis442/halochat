<script lang="ts">
  import { eventListener, getData, pool } from '../state/pool'
  import { uniqBy, prop, sortBy } from 'ramda'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import { processEvent, initData } from '../state/app'
  import Note from './Note.svelte'
  import { last } from 'ramda'
  import type { Filter, Event, Note as NoteEvent } from '../state/types'
  import { now } from '../util/time'
  import { account } from '../stores/account'
  import Scrollable  from './Scrollable.svelte';

  const noteData = writable([])

  let isLoading = true
  let lastTimeStamp = now()

  /**
   * 
   * @param myNotes
   */
  function updateNotes(myNotes: Array<NoteEvent>) {
    noteData.update(($noteData) => {
      console.log('Update list', myNotes)
      return uniqBy(prop('id'), $noteData.concat(myNotes))
    })
    console.log('Update view with $noteData')
    $noteData = sortBy(prop('created_at'), $noteData).reverse()
  }

  /**
   * 
   */
  async function getNoteData() {
    let filter: Filter = {
      kinds: [1, 5, 7],
      until: lastTimeStamp,
      limit: 10,
    }
    isLoading = true
    let eventData = await getData(filter)
    eventData = uniqBy(prop('id'), eventData) //We have multiple relays so wwe want unique events
    console.log('Raw event data: ', eventData)
    // Black list while result in 0 process event so we need to get the last Update timestamp here
    let lastEvent: Event = last(eventData)
    if (lastEvent.created_at < lastTimeStamp) {
      lastTimeStamp = lastEvent.created_at
    }
    const noteData: Array<NoteEvent> = await processEvent(eventData)
    console.log('Processed data: ', noteData)
    updateNotes(noteData)
    isLoading = false
  }

 
  let msg = ''

  function sendMessage() {
    pool.setPrivateKey($account.privkey)
    let event = {
      content: msg,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      pubkey: $account.pubkey,
    }

    pool.publish(event, (status) => {
      console.log('Publish status')
    })
  }

  onMount(async () => {
    isLoading = true
    const data = await initData()
    const noteData = await processEvent(data)
    updateNotes(noteData)
    /*
      eventListener((event) => {
        processEvent(event).then((noteData) => {
          updateNotes(noteData)
        })
      })
      */
  })
</script>

<div class="pt-10 max-h-full" style="height:800px">
  <div
    id="Notes"
    class="cointainer overflow-y-auto h-full relative max-w-full mx-auto
    bg-white dark:bg-slate-800 dark:highlight-white/5 shadow-lg ring-1
    ring-black/5 rounded-xl flex flex-col flex-initial divide-y
    dark:divide-slate-200/5 ml-4 mr-4">
    {#each $noteData as note, index}
      <Note {note} {index} />
    {/each}

    <Scrollable loading={isLoading} cbGetData={getNoteData} rootElement='Notes' observeElement='footer'/>
    <footer id="footer" />
  </div>
</div>
<div>
  Here comes the form
  <input type="text" bind:value={msg} placeholder="message to send" />
  <button on:click={sendMessage}>Send</button>
</div>
