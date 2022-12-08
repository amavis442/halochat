<script lang="ts">
    import { relays } from '../state/pool'
    import Toasts from '../lib/Toasts.svelte'
    import { addToast } from '../stores/toast'
    import { onMount } from 'svelte'
  

    let url = ''
  
    function deleteRelay(url: string) {
      relays.update((data) => {
        return data.filter((value: string) => {
          return value != url
        })
      })
    }
  
    function addRelay() {
      url = url.trim()
      if (!url.match(/^wss?:\/\/[\w.:-]+$/)) {
        addToast({
          message: 'Please start websocket url with wss://',
          type: 'error',
          dismissible: true,
          timeout: 3000,
        })
        return
      }
  
      relays.update((data) => {
        const result = data.find((value: string) => value.includes(url))
        if (!result) {
          return [...data, url]
        }
        return data
      })
    }
  
  </script>
  
  <Toasts />
  
  <form class="w-full max-w-sm">
    <div class="md:flex md:items-center mb-6">
      <div class="md:w-1/3">
        <label
          class="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
          for="inline-relay">
          Relay
        </label>
      </div>
      <div class="md:w-2/3">
        <input
          bind:value={url}
          id="inline-relay"
          class="bg-gray-200 appearance-none border-2 border-gray-200 rounded
          w-full py-2 px-4 text-black leading-tight focus:outline-none
          focus:bg-white focus:border-purple-500"
          type="text"
          placeholder="wss://nostr.rocks" />
      </div>
    </div>
    <div class="md:flex md:items-center">
      <div class="md:w-1/3" />
      <div class="md:w-2/3">
        <button
          class="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline
          focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="button"
          on:click={addRelay}>
          Add
        </button>
      </div>
    </div>
  </form>
  
  {#each $relays as relay}
    <button on:click={() => deleteRelay(relay)}>
      <span class="fa-solid fa-trash" />
    </button>
    {relay}
    <br />
  {/each}
  