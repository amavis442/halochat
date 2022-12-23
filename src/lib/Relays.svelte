<script lang="ts">
  import { relays } from "./state/pool";
  import Toasts from "../lib/Toasts.svelte";
  import { addToast } from "./stores/toast";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Link from "./partials/Link.svelte";
  import { kMaxLength } from "buffer";

  let url: string = "";
  let read: boolean = true;
  let write: boolean = true;

  function deleteRelay(url: string) {
    relays.update((data) => {
      delete(data[url])
      return data
    });
    addToast({
      message: "Relay removed!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  function addRelay() {
    url = url.trim();
    if (
      !url.match(/^wss?:\/\/[\w.:-]+$/) &&
      !url.match(/^http?:\/\/[\w.:-]+$/)
    ) {
      addToast({
        message: "Please start websocket url with wss://",
        type: "error",
        dismissible: true,
        timeout: 3000,
      });
    }

    relays.update((data) => {
      if (!data) data = {};
      const result = data[url];
      if (!result) {
        data[url] = { read: read, write: write };
        return data;
      }
      return data;
    });
    addToast({
      message: "Relay [" + url + "] added!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  /**
   * @see https://www.thisdot.co/blog/handling-forms-in-svelte
   * @param e
   */
  function onSubmit() {
    addRelay();
    url = "";
  }

  //relays.set({})
</script>

<Toasts />

<div
  class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 bg-blue-200"
>
  <form on:submit|preventDefault={onSubmit} class="w-full">
    <div class="flex gap-4 w-full">
      <div class="form-group mb-2 w-full">
        <Text
          bind:value={url}
          id="relayUrl"
          describedby="relayHelp"
          placeholder="wss://nostr.rocks"
        />
      </div>
      <div class="form-group mb-2 w-full">
        <input
          type="checkbox"
          bind:checked={read}
          id="read"
          class="form-check-input"
        />
        <label class="form-check-label inline-block text-gray-800" for="read">
          <span class="text-sm">read</span>
        </label>

        <input
          type="checkbox"
          bind:checked={write}
          id="write"
          class="form-check-input"
        />
        <label class="form-check-label inline-block text-gray-800" for="write">
          <span class="text-sm">write</span>
        </label>
      </div>
    </div>

    <div class="md:flex md:items-center mb-6">
      <small id="relayHelp" class="block mt-1 text-xs text-gray-600">
        A relay is a service where we send and receive messages from. We need at
        least 1 relay to receive and to send messages to. The relays usually has
        the form of wss://[name of relay]. For more relays see
        <Link href="https://nostr-registry.netlify.app/">nostr-registry</Link>
      </small>
    </div>
    <div>
      <Button type="submit">Submit</Button>
    </div>
  </form>
</div>

{#if $relays}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      {#each Object.entries($relays).map( (item) => {
        let k = { url: item[0], read: item[1].read, write: item[1].write };
        console.log(k);
        return k;
      }) as relay, index (url)}
        <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
          <button on:click={() => deleteRelay(relay.url)}>
            <span class="fa-solid fa-trash" />
          </button>
          {relay.url} [Read: {relay.read}, Write: {relay.write}]
        </li>
      {/each}
    </ul>
  </div>
{/if}
