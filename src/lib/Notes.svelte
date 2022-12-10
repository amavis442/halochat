<script lang="ts">
  import { eventListener, getData, pool, relays } from './state/pool'
  import { uniqBy, prop, sortBy } from 'ramda'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import {
    processEvent,
    initData,
    lastTimeStamp,
    firstTimeStamp,
  } from './state/app'
  import Note from './Note.svelte'
  import type { Filter, Event, Note as NoteEvent } from './state/types'
  import { account } from './stores/account'
  import Scrollable from './Scrollable.svelte'
  import Button from './partials/Button.svelte'
  import Text from './partials/Text.svelte'
  import Anchor from './partials/Anchor.svelte'
  import { eventdata } from './stores/eventdata'

  const noteData = writable([])
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
      kinds: [0, 1, 5, 7],
      until: lastTimeStamp,
      limit: 20,
    }
    let eventData = await getData(filter)
    eventData = uniqBy(prop('id'), eventData) //We have multiple relays so wwe want unique events
    console.log('Raw event data: ', eventData)
    // Black list while result in 0 process event so we need to get the last Update timestamp here
    const noteData: Array<NoteEvent> = await processEvent(eventData)
    console.log('Processed data: ', noteData)
    await updateNotes(noteData)
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
      let data:Array<Event> = []
      if ($eventdata) {
        data = $eventdata
      } else {
        data = await initData()
      }
      let noteData = await processEvent(data)
      console.log('First: ', firstTimeStamp, ', Last: ', lastTimeStamp)
      updateNotes(noteData)

      if (noteData.length < 20) {
        console.log('Need more data')

        let filter: Filter = {
          kinds: [1, 5, 7],
          until: lastTimeStamp,
          limit: 30,
        }
        data = await getData(filter)
        let pData = await processEvent(data)
        console.log(
          'First: ',
          firstTimeStamp,
          ', Last: ',
          lastTimeStamp,
          'Data: ',
          data,
          ', pData: ',
          pData,
        )
        updateNotes(pData)
      }
    }

    eventListener((event) => {
      processEvent(event).then((noteData) => {
        updateNotes(noteData)
      })
    })
  })
</script>

<div class="flex flex-col gap-4 h-screen">
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

        <Scrollable cbGetData={getNoteData} rootElement="Notes" />
        <footer id="footer" class="h-5" />
      </div>
    {:else}
      Please add an relay first. You can do this here
      <Anchor href="relays">relays</Anchor>
    {/if}
  </div>
  <div class="h-15p">
    {#if $relays.length && $account.privkey}
      <div class="block max-w-full flex justify-center">
        <div class="w-4/5 mr-2">
          <Text bind:value={msg} id="msg" placeholder="Message to send" />
        </div>
        <Button type="button" click={sendMessage}>Send</Button>
      </div>
    {:else}
      To send messages, you need to add private key and have relays added. You
      can generate your private key and add them here. For relays see the link
      above.
      <Anchor href="account">account</Anchor>
    {/if}
  </div>
</div>
