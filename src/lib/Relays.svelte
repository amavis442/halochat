<script lang="ts">
  import { relays } from '../state/pool'
  import Toasts from '../lib/Toasts.svelte'
  import { addToast } from '../stores/toast'
  import Button from './partials/Button.svelte'
  import Text from './partials/Text.svelte'
  import Anchor from './partials/Anchor.svelte'
  import Link from './partials/Link.svelte'

  let url = ''

  function deleteRelay(url: string) {
    relays.update((data) => {
      return data.filter((value: string) => {
        return value != url
      })
    })
    addToast({
      message: 'Relay removed!',
      type: 'success',
      dismissible: true,
      timeout: 3000,
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
    addToast({
      message: 'Relay [' + url + '] added!',
      type: 'success',
      dismissible: true,
      timeout: 3000,
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
      <Text
        bind:value={url}
        id="relayUrl"
        describedby="relayHelp"
        placeholder="wss://nostr.rocks" />
      <small id="relayHelp" class="block mt-1 text-xs text-gray-600">
        A relay is a service where we send and receive messages from. We need at
        least 1 relay to receive and to send messages to. The relays usually has
        the form of wss://[name of relay]. For more relays see
        <Link href="https://nostr-registry.netlify.app/">nostr-registry</Link>
      </small>
    </div>
    <Button type="submit">Submit</Button>
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
