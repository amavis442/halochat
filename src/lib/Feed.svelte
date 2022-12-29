<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get, writable } from "svelte/store";
  import { Listener, lastSeen } from "./state/app";
  import type { TextNote as NoteEvent, Account } from "./state/types";
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import contacts from "./state/contacts";
  import { log } from "./util/misc";
  import Feeder from "./partials/Feeder.svelte";
  import { getTime } from "./util/time";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";
  import Button from "./partials/Button.svelte";
  import { descend, head, prop, sort, uniq, uniqBy } from "ramda";

  let msg = "";
  let replyTo: NoteEvent | null = null;
  let moreLoading = Promise<void>;
  let userHasAccount: boolean = false;
  let listener: Listener;

  function sendMessage() {
    if (replyTo) {
      log(replyTo);
      publishReply(msg, replyTo);
    }
    if (!replyTo) {
      publish(1, msg);
    }
    replyTo = null;
    msg = "";
  }

  let page = writable([]);
  onMount(async () => {
    if ($relays && $relays.length) {
      listener = new Listener({ since: $lastSeen }, "globalfeed");
      listener.start();
      console.log("Last seen:", getTime($lastSeen));

      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        contacts.getContacts($account.pubkey);
      }
    }
    $page = [];
    console.debug("Page content", $page, $page.length);
    let timer = setInterval(() => {
      if ($feed.length && $page.length < 11) {
        //$page = [$page, ...$feed.slice(0, 10)]
        let item = $feed.shift();
        $page.unshift(item);
        console.log("Page item", item);
      }
      if ($page.length > 9) {
        console.log("Page limit reached");
        clearInterval(timer);
      }
      updateLastSeen(head($page))
      $page = uniq($page)
      $page = $page;
    }, 1000);
  });

  onDestroy(() => {
    if (listener) {
      feed.set([]);
      listener.stop();
    }
  });

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    console.log(scrollTop, scrollHeight, clientHeight);

    if (scrollTop <= 15) {
      console.log("Should use bounce");
    }
  }

  function updateLastSeen(note:TextNote){
    let tags = note.tags.filter(t => t[0] == 'e')

    if (tags.length == 0) {
        if ($lastSeen < note.created_at) {
            lastSeen.set(note.created_at)
        }
    }
  }

  function loadMore() {
    console.log($feed.length);
    if ($feed.length) {
      let maxItems = $feed.length < 10 ? $feed.length : 11;
      //$page = [$page, ...$feed.slice(0, 10)]
      for (let i = 0; i < maxItems; i++) {
        let item = $feed.shift();
        $page.unshift(item);
        console.log("Page item", item), typeof item;
      }
      updateLastSeen(head($page))
    }
    $page = uniqBy(prop('id'), $page)
    let byCreatedAt = descend<TextNote>(prop("created_at"));
    sort(byCreatedAt, $page)
  }
</script>

<Feeder bind:msg {scrollHandler} {sendMessage}>
  <slot>
    {#if $feed.length > 9}<div class="flex h-8 w-full justify-center mt-2">
        <Button click={loadMore} class="flex w-full justify-center">Load 10 more notes <span
          class="inline-block py-1 px-1.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-red-600 text-white rounded ml-2"
          >
          {$feed.length}
          </span>
        </Button>
      </div>{/if}
    {#each $page ? $page : [] as note (note.id)}
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
