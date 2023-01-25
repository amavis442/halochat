<script lang="ts">
  import { getData, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get, writable } from "svelte/store";
  import type { TextNote as Note, Account } from "./state/types";
  import type { Filter } from "nostr-tools";
  import { account } from "./stores/account";
  import { now } from "./util/time";
  import { descend, head, keys, pick, prop, sort, uniq, uniqBy } from "ramda";
  import { feed } from "./state/app";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";
  import Spinner from "./partials/Spinner/Spinner.svelte";
  import Anchor from "./partials/Anchor.svelte";
  import Feeder from "./partials/Feeder.svelte";
  import { Listener } from "./state/app";

  let moreLoading = Promise<void>;
  let listener: Listener;
  let msg: string = "";
  let userHasAccount: boolean = false;
  let page = writable([]);
  onMount(async () => {
    if ($relays && $relays.length) {
      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        let filter1: Filter = {
          kinds: [1],
          authors: [$account.pubkey],
          since: now() - 60 * 60 * 24 * 7,
        };
        let filter2: Filter = {
          kinds: [1],
          since: now() - 60 * 60 * 24 * 7,
          "#p": [$account.pubkey],
        };

        listener = new Listener([filter1, filter2], "userpostfeed");
        listener.start();
      }
    }
  });

  onDestroy(() => {
    if (listener) {
      page.set([]);
      listener.stop();
      unsubscribeFeed();
    }
  });

  function sendMessage() {}

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      //debounceFunc();
    }
  }

  let byCreatedAt = descend<TextNote>(prop("created_at"));
  const unsubscribeFeed = feed.subscribe(($feed) => {
    $feed.forEach((item) => {
      if (!item.tags.find((tag) => tag[0] === "e") && item.id && item.dirty) {
        page.update((data) => {
          if (item) {
            //console.debug("Item is: ", item);
            let note = data.find((d) => d.id == item.id);
            if (note) {
              note = item;
            }
            if (!note) {
              data.push(item);
            }
            //console.debug("Item is page", data);
          }
          return data;
        });
        item.dirty = false;
      }
    });
    $page = sort(byCreatedAt, $page);
    //console.debug("Page content is (sorted)", $page);
  });
</script>

<Feeder bind:msg {scrollHandler} {sendMessage}>
  <slot>
    {#each $page ? $page : [] as note (note.id)}
      <ul class="items-center w-full border-hidden">
        <li>
          <div class="flex flex-col items-top p-2 w-full overflow-hidden mb-2">
            {#if note.content !== "BANNED"}
              <TextNote {note} {userHasAccount} />
              {#if note?.replies && note.replies.length > 0}
                <TreeNote
                  replies={note.replies}
                  {userHasAccount}
                  expanded={false}
                  num={note.replies.length}
                />
              {/if}
            {/if}
          </div>
        </li>
      </ul>
    {/each}
  </slot>
</Feeder>
