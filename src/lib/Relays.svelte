<script lang="ts">
  import { relays } from '../state/pool'
  import Toasts from '../lib/Toasts.svelte'
  import { addToast } from '../stores/toast'

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
    if (
      !url.match(/^wss?:\/\/[\w.:-]+$/) &&
      !url.match(/^http?:\/\/[\w.:-]+$/)
    ) {
      addToast({
        message: 'Please start websocket url with wss://',
        type: 'error',
        dismissible: true,
        timeout: 3000,
      })
    }

    relays.update((data) => {
      const result = data.find((value: string) => value.includes(url))
      if (!result) {
        return [...data, url]
      }
      return data
    })
  }

  /**
   * @see https://www.thisdot.co/blog/handling-forms-in-svelte
   * @param e
   */
  function onSubmit(e) {
    addRelay()
    url = ''
  }
</script>

<Toasts />

<div class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6">
  <form on:submit|preventDefault={onSubmit}>
    <div class="form-group mb-6">
      <label for="url" class="form-label inline-block mb-2 text-gray-700">
        Relay
      </label>
      <input
        type="text"
        bind:value={url}
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none"
        id="pubKey"
        aria-describedby="emailHelp"
        placeholder="wss://nostr.rocks" />
      <small id="pubkeyHelp" class="block mt-1 text-xs text-gray-600">
        A relay is a service where we send and receive messages from. We need at
        least 1 relay to receive and to send messages to. The relays usually has
        the form of wss://[name of relay]. For more relays see <a href="https://nostr-registry.netlify.app/" class="text-blue-600 visited:text-purple-600">nostr-registry</a>
      </small>
    </div>
    <button
      type="submit"
      class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
      leading-tight uppercase rounded shadow-md hover:bg-blue-700
      hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
      focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
      ease-in-out opacity-100">
      Submit
    </button>
  </form>
</div>

{#if $relays.length}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6 text-left">
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      {#each $relays as relay}
        <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
          <button on:click={() => deleteRelay(relay)}>
            <span class="fa-solid fa-trash" />
          </button>
          {relay}
        </li>
      {/each}
    </ul>
  </div>
{/if}
