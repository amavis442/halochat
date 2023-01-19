<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import { get, writable, type Writable } from "svelte/store";
  import { Listener, lastSeen } from "./state/app";
  import type { TextNote as NoteEvent, Account } from "./state/types";
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import { feedStack, mute } from "./state/app";
  import { blocklist } from "./stores/block";

  import contacts from "./state/contacts";
  import { log } from "./util/misc";
  import Feeder from "./partials/Feeder.svelte";
  import { getTime } from "./util/time";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";
  import Button from "./partials/Button.svelte";
  import { descend, head, keys, pick, prop, sort, uniq, uniqBy } from "ramda";
  import { notifications } from "./state/app";
  import { getReplyTag, getRootTag } from "./util/tags";
  import { deleteNodeFromTree } from "./util/misc";

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

  let pageNumber: number = 0;
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
  });

  onDestroy(() => {
    if (listener) {
      feed.set([]);
      listener.stop();
    }
  });

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    //console.log(scrollTop, scrollHeight, clientHeight);

    if (scrollTop <= 15) {
      //console.log("Should use bounce");
    }
  }

  function updateLastSeen(note: TextNote) {
    if (!note) return;
    let tags = [];
    if (note.tags && note.tags.length) {
      tags = note.tags.filter((t) => t[0] == "e");
    }

    if (tags.length == 0) {
      if ($lastSeen < note.created_at) {
        lastSeen.set(note.created_at);
      }
    }
  }

  function loadMore() {
    pageNumber = pageNumber + 1;
    console.log("Feed length ", $feed.length, " PageNumber ", pageNumber);
    if ($feed.length - $page.length > 0) {
      let byCreatedAt = descend<TextNote>(prop("created_at"));

      page.update((data) => {
        for (let i = pageNumber * 10; i < (pageNumber + 1) * 10; i++) {
          data[$feed[i].id] = $feed[i];
        }
        data = sort(byCreatedAt, data);
        updateLastSeen(head(data))
        return data;
      });
    }
  }

  afterUpdate(() => {
    notifications.update((data) => $feed.length - $page.length);
  });

  mute.subscribe(($mutes) => {
    for (const mute of $mutes) {
      if ($feedStack[mute]) {
        let rootTag = getRootTag($feedStack[mute].tags);

        console.log("Detected mute change", mute, rootTag);
        if (rootTag && rootTag.length && rootTag[0] == "e") {
          let parentNode = $page.find((p) => p.id == rootTag[1]);
          console.log(
            "Detected mute change and rootTag is ",
            rootTag,
            parentNode,
            $feedStack[rootTag[1]]
          );
          if (parentNode) {
            deleteNodeFromTree(parentNode, mute);
            console.log(
              "Detected mute change and running deleteNodeFromTree",
              mute
            );
            $page = $page;
          }
        }
        if (!rootTag || rootTag.length == 0) {
          $page = $page.filter((p) => p.id != mute);
        }
      }
    }
  });

  let byCreatedAt = descend<TextNote>(prop("created_at"));
  feed.subscribe(($feed) => {
    $feed.forEach(item => {
      if (!item.tags.find(tag => tag[0] === 'e') && item.id && item.dirty) {
        page.update((data) => {
          if (item) {
            console.debug('Item is: ', item)
            let note = data.find((d => d.id == item.id))
            if (note) {
              note = item
            }
            if (!note) {
              data.push(item)
            }
            console.debug('Item is page', data)
          }
          return data
        })
        item.dirty = false
      }
    })
    $page = sort(byCreatedAt, $page)
    updateLastSeen(head($page))
    console.debug('Page content is (sorted)', $page)
  })
  

  blocklist.subscribe(($blocked) => {
    for (const pubkey of $blocked) {
      Object.entries($feedStack).forEach((note:any) => {
        if (note.pubkey == pubkey) {
          note = null;
        }
      });
    }

    page.update(($pages) => {
      $pages.forEach((item, id) => {
        if ($blocked.includes(item.pubkey)) {
          delete item[id];
        }

        if (item && item.replies.length) {
          item.replies.forEach((reply) => {
            if ($blocked.includes(reply.pubkey)) {
              delete reply[id];
            }
          });
        }
      });
      return $pages;
    });
  });
</script>

<Feeder bind:msg {scrollHandler} {sendMessage}>
  <slot>
    {#if $feed.length - $page.length > 0}<div
        class="flex h-8 w-full justify-center mt-2"
      >
        <Button click={loadMore} class="flex w-full justify-center"
          >Load 10 more notes <span
            class="inline-block py-1 px-1.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-red-600 text-white rounded ml-2"
          >
            {$feed.length - $page.length}
          </span>
        </Button>
      </div>{/if}
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
