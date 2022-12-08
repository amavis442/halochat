<script lang="ts">
  import { eventListener, getData, pool } from '../state/pool'
  import { uniqBy, prop } from 'ramda'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import Spinner from './Spinner.svelte'
  import { processEvent, initData } from '../state/app'
  import Note from './Note.svelte'
  import { last,nth } from 'ramda'
  import { delay } from '../util/time'
  import { throttle } from 'throttle-debounce'
  import type { Filter } from '../state/types'
  import { now } from '../util/time'
  import { account } from '../stores/account'

  const noteData = writable([])

  //localStorage.setItem('halonostr/users', '')
  //$users = []
  let isLoading = true
  let lastTimeStamp = now()

  export function updateNotes(myNotes) {
    noteData.update(($noteData) => {
      console.log('Update list', myNotes)
      return uniqBy(prop('id'), $noteData.concat(myNotes))
    })

    isLoading = false
    return true
  }

  function getNoteData(filter: Filter) {
    return new Promise((resolve, reject) => {
      const data = getData(filter)
      resolve(data)
    })
      .then((eventData:any) => {
        eventData = uniqBy(prop('id'), eventData) //We have multiple relays so wwe want unique events
        console.log('Raw event data: ',eventData)
        // Black list while result in 0 process event so we need to get the last Update timestamp here
        const lastEvent:Note = last(eventData)
        if (lastEvent.created_at < lastTimeStamp) {
          lastTimeStamp = lastEvent.created_at
        }

        return processEvent(eventData)
      })
      .then((noteData: any) => {
        console.log('Processed data: ', noteData)
        return updateNotes(noteData)
      })
  }

  let options = {
    root: document.getElementById('Notes'),
    rootMargin: '0px',
    threshold: 1.0,
  }

  function first(list:any){
    return nth(0,list)
  }

  let observer = new IntersectionObserver(handleIntersection, options)
  async function handleIntersection(changes, observer) {
    if (isLoading) return
    changes.forEach((change) => {
      if (change.intersectionRatio > 0) {
        isLoading = true
        console.log('Last event timestamp: ', lastTimeStamp)

        const throttleFunc = throttle(
          1000,
          async () => {
            console.log('Getting data')
            let filter: Filter = {
              kinds: [1, 5, 7],
              until: lastTimeStamp,
              limit: 10,
            }
            await getNoteData(filter)
            await delay(300)
          },
          { noLeading: false, noTrailing: false },
        )

        throttleFunc()
      }
    })
  }

  let msg = ''

  function sendMessage()
  {
    pool.setPrivateKey($account.privkey)
    let event = {
          content: msg,
          created_at: Math.floor(Date.now() / 1000),
          kind: 1,
          tags: [],
          pubkey: $account.pubkey,
        };

    pool.publish(event,(status) => {console.log('Publish status')})
  }


  onMount(async () => {
    observer.observe(document.querySelector('footer'))

    isLoading = true
    new Promise((resolve, reject) => {
      const data = initData()
      resolve(data)
    })
      .then((eventData) => {
        return processEvent(eventData)
      })
      .then((noteData: any) => {
        return updateNotes(noteData)
      })

      eventListener((event) => {
        processEvent(event).then((noteData) => {
          updateNotes(noteData)
        })
      })
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
    {#if isLoading}
      <Spinner />
    {/if}
    <footer id="footer" />
  </div>
</div>
<div>Here comes the form <input type="text" bind:value={msg} placeholder='message to send' /><button on:click={sendMessage}>Send</button></div>
