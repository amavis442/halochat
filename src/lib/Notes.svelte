<script lang="ts">
  import { eventListener, getData, pool, relays } from '../state/pool'
  import { uniqBy, prop, sortBy } from 'ramda'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import { processEvent, initData } from '../state/app'
  import Note from './Note.svelte'
  import { last } from 'ramda'
  import type { Filter, Event, Note as NoteEvent } from '../state/types'
  import { now } from '../util/time'
  import { account } from '../stores/account'
  import Scrollable from './Scrollable.svelte'

  const noteData = writable([])
  let lastTimeStamp = now()

  /**
   *
   * @param myNotes
   */
  async function updateNotes(myNotes: Array<NoteEvent>) {
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
      kinds: [1], //For now only ask for kind 1 and not 1, 5 , 7
      until: lastTimeStamp,
      limit: 10,
    }
    let eventData = await getData(filter)
    eventData = uniqBy(prop('id'), eventData) //We have multiple relays so wwe want unique events
    console.log('Raw event data: ', eventData)
    // Black list while result in 0 process event so we need to get the last Update timestamp here
    const noteData: Array<NoteEvent> = await processEvent(eventData)
    console.log('Processed data: ', noteData)
    await updateNotes(noteData)
    let lastEvent: Event = last(eventData)
    if (lastEvent.created_at < lastTimeStamp) {
      lastTimeStamp = lastEvent.created_at
    }
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
    if ($relays.length) {
      const data = await initData()
      const noteData = await processEvent(data)
      updateNotes(noteData)
    }

    /*
      eventListener((event) => {
        processEvent(event).then((noteData) => {
          updateNotes(noteData)
        })
      })
      */
  })
</script>

<div class="flex flex-col gap-4 h-screen">
  <div class="h-5p">
    <h2 class="mt-2">Halonostr: nostr client</h2>
  </div>
  <div class="h-85p">
    {#if $relays.length}
      <div
        id="Notes"
        class="cointainer overflow-y-auto relative max-w-full mx-auto bg-white
        dark:bg-slate-800 dark:highlight-white/5 shadow-lg ring-1 ring-black/5
        rounded-xl divide-y dark:divide-slate-200/5 ml-4 mr-4 h-full max-h-full">
        {#each $noteData as note, index}
          <Note {note} {index} />
        {/each}
        
        <Scrollable
          cbGetData={getNoteData}
          rootElement="Notes" />
        <footer id="footer" class="h-5" />
      </div>
    {:else}
      Please add an relay first. You can do this here
      <a
        href="relays"
        class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
        leading-tight uppercase rounded shadow-md hover:bg-blue-700
        hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
        focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
        ease-in-out mb-4">
        relays
      </a>
    {/if}
  </div>
  <div class="h-10p">
    {#if $relays.length && $account.privkey}
      <div class="block max-w-full flex justify-center">
        <div class="w-4/5 mr-2">
          <input
            type="text"
            id="msg"
            bind:value={msg}
            placeholder="Message to send"
            class="block w-full px-3 py-1.5 text-base font-normal text-gray-700
            bg-white bg-clip-padding border border-solid border-gray-300 rounded
            transition ease-in-out m-0 focus:text-gray-700 focus:bg-white
            focus:border-blue-600 focus:outline-none" />
        </div>
        <button
          on:click={sendMessage}
          class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
          leading-tight uppercase rounded shadow-md hover:bg-blue-700
          hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
          focus:ring-0 active:bg-blue-800 active:shadow-lg transition
          duration-150 ease-in-out">
          Send
        </button>
      </div>
    {:else}
      To send messages, you need to add private key and have relays added. You
      can generate your private key and add them here. For relays see the link
      above.
      <a
        href="account"
        class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
        leading-tight uppercase rounded shadow-md hover:bg-blue-700
        hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
        focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
        ease-in-out mb-4">
        account.
      </a>
    {/if}
  </div>
</div>
