<script lang="ts">
  import { pool, relays } from "../state/pool";
  import { addToast } from "../partials/Toast/toast";
  import Button from "../partials/Button.svelte";
  import Text from "../partials/Text.svelte";
  import Link from "../partials/Link.svelte";

  let url: string = "";
  let read: boolean = true;
  let write: boolean = true;

  function deleteRelay(url: string) {
    relays.update((data) => {
      data = data.filter(d => {
        console.log('Url:', url, 'Url reg:', d.url)
        return d.url != url
      });
      console.log('Data:' , data)
      return data;
    });
    console.log($relays)

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
      !url.match(/^wss?:\/\/[\w.:\/-]+$/) &&
      !url.match(/^http?:\/\/[\w.:\/-]+$/)
    ) {
     
      addToast({
        message: "Please start websocket url with wss://",
        type: "error",
        dismissible: true,
        timeout: 3000,
      });
      return;
    }

    relays.update((data) => {
      if (!data) data = [];
      const result = data.find(d=>d.url ==url);
      if (!result) {
        data.push({url:url, read: read, write: write});
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

  function resetRelays() {
    relays.set([]);
  }

</script>

<div class="xl:w-8/12 lg:w-10/12 md:w-10/12 sm:w-full">
  <div
    class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6 bg-blue-200"
  >
    <form on:submit|preventDefault={onSubmit}>
      <div class="flex gap-4 w-full">
        
        <div class="flex w-full">
          <Text
            bind:value={url}
            id="relayUrl"
            describedby="relayHelp"
            placeholder="wss://nostr.rocks"
          />
        </div>

        <div class="flex">
          <div class="form-check form-check-inline pr-2  w-14">
            <input
              type="checkbox"
              bind:checked={read}
              id="read"
              class="form-check-input"
            />
            <label
              class="form-check-label inline-block text-gray-800"
              for="read"
            >
              <span class="text-sm">read</span>
            </label>
        </div>
          <div class="form-check form-check-inline w-14">
            <input
              type="checkbox"
              bind:checked={write}
              id="write"
              class="form-check-input"
            />
            <label
              class="form-check-label inline-block text-gray-800"
              for="write"
            >
              <span class="text-sm">write</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end">
          <Button type="submit" {...{ class: "flex" }}>Add</Button>
        </div>
      </div>

      <div class="md:flex md:items-center mb-6">
        <small id="relayHelp" class="block mt-1 text-xs text-gray-600">
          A relay is a service where we send and receive messages from. We need
          at least 1 relay to receive and to send messages to. The relays
          usually has the form of wss://[name of relay]. For more relays see
          <Link href="https://nostr-registry.netlify.app/">nostr-registry</Link>
        </small>
      </div>
    </form>
  </div>

  {#if $relays}
    <div
      class="block p-6 rounded-lg shadow-lg bg-white w-full  ml-6 mt-6  bg-blue-200"
    >
      <div class="flex w-full justify-end pb-2">
        <Button click={resetRelays}>Reset relays</Button>
      </div>

      <ul
        class="bg-white rounded-lg border border-gray-200 w-full text-gray-900 text-left"
      >
        {#each $relays as relay}
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
</div>
