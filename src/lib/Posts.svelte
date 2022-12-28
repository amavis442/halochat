<script lang="ts">
  import { getData, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get, writable } from "svelte/store";
  import type { TextNote as Note, Account } from "./state/types";
  import type { Filter } from "nostr-tools";
  import { account } from "./stores/account";
  import { now } from "./util/time";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";
  import Spinner from "./partials/Spinner/Spinner.svelte";
  import Anchor from "./partials/Anchor.svelte";

  let moreLoading = Promise<void>;

  let posts = writable([]);
  let userHasAccount: boolean = false;
  let feed: Array<Note> = [];
  onMount(async () => {
    if ($relays && $relays.length) {
      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        let filter: Filter = {
          kinds: [1],
          authors: [$account.pubkey],
          since: now() - 60 * 60 * 24 * 7,
          "#p": [$account.pubkey],
        };
        console.log(filter);
        feed = await getData(filter);
        posts.set(feed);
      }
    }
  });

  onDestroy(() => {});

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      //debounceFunc();
    }
  }
</script>

<div class="flex flex-col gap-4 h-screen">
  <div class="h-85p">
    <div
      id="Notes"
      class="flex flex-col overflow-y-auto relative mx-auto bg-gray-800
        dark:highlight-white/5 shadow-lg ring-1 ring-black/5
        rounded-xl divide-y ml-4 mr-4 mt-6
        space-y-0 place-content-start
        h-full max-h-full w-11/12"
      on:scroll={scrollHandler}
    >
      {#if $relays && $relays.length}
        {#each $posts ? $posts : [] as note (note.id)}
          <ul class="items-center w-full mb-2 border-hidden">
            <li>
              <div
                class="flex flex-col items-top gap-4 p-4 w-full overflow-hidden rounded-lg bg-blue-200 mb-2"
              >
                <TextNote {note} {userHasAccount} />
                {#if note?.replies && note.replies.length > 0}
                  <TreeNote
                    notes={note.replies}
                    {userHasAccount}
                    expanded={false}
                    num={note.replies.length}
                    level={1}
                  />
                {/if}
              </div>
            </li>
          </ul>
        {/each}

        {#await moreLoading}
          <Spinner size={36} />
        {/await}
      {:else}
        <p class="bg-white">
          Please add a relay first. You can do this here
          <Anchor href="relays">relays</Anchor>
        </p>
      {/if}
    </div>
  </div>
</div>
