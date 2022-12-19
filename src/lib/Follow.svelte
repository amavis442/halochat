<script lang="ts">
  import { relays } from "./state/pool";
  import { addToast } from "./stores/toast";
  import { followlist } from "./state/app";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import { now } from "./util/time";
  import { prop, uniqBy } from "ramda";
  
  let pubkey = "";

  function unFollow(pubkey: string) {
    $followlist = $followlist.filter((f) => f.pubkey != pubkey);

    addToast({
      message: "Unfollow: " + pubkey.slice(0, 10),
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  function follow() {
    $followlist.push({ pubkey: pubkey, added: now() });
    $followlist= uniqBy(prop('pubkey'),$followlist)

    addToast({
      message: "Following: " + pubkey.slice(0, 10),
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
    follow();
  }
</script>

<div
  class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 bg-blue-200"
>
  <form on:submit|preventDefault={onSubmit}>
    <div class="form-group mb-6">
      <label for="url" class="form-label inline-block mb-2 text-gray-700">
        Relay
      </label>
      <Text bind:value={pubkey} id="relayUrl" placeholder="pubkey" />
    </div>
    <Button type="submit">Submit</Button>
  </form>
</div>

{#if $relays.length}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      {#each $followlist as follow}
        <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
          <button on:click={() => unFollow(follow.pubkey)}>
            <span class="fa-solid fa-trash" />
          </button>
          {follow.pubkey.slice(0,10)}....{follow.pubkey.slice(-10)}
        </li>
      {/each}
    </ul>
  </div>
{/if}
