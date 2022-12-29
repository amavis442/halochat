<script lang="ts">
  import { getData, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { feed } from "./state/app";
  import type { TextNote as Note, Account } from "./state/types";
  import type { Filter } from "nostr-tools";
  import { account } from "./stores/account";
  import { now } from "./util/time";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";
  import Spinner from "./partials/Spinner/Spinner.svelte";
  import Anchor from "./partials/Anchor.svelte";
  import Feeder from "./partials/Feeder.svelte";

  let moreLoading = Promise<void>;

  let msg: string = "";
  let userHasAccount: boolean = false;
  let posts: Array<Note> = [];
  onMount(async () => {
    feed.set([]);
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
        posts = await getData(filter);
        feed.set(posts);
      }
    }
  });

  onDestroy(() => {});

  function sendMessage() {}

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;

    console.log(scrollTop, scrollHeight, clientHeight);

    if (scrollTop + clientHeight >= scrollHeight - 15) {
      //debounceFunc();
    }
  }
</script>

<Feeder bind:msg {sendMessage} {scrollHandler} >
<slot>
  {#each $feed ? $feed : [] as note (note.id)}
  <ul class="items-center w-full border-hidden">
    <li>
      <div class="flex flex-col items-top p-2 w-full overflow-hidden mb-2">
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
</slot>
</Feeder>
