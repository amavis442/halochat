<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import { get, writable, type Writable } from "svelte/store";
  import { Listener, lastSeen } from "./state/app";
  import type { TextNote as NoteEvent, Account, User } from "./state/types";
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import { feedStack, mute } from "./state/app";
  import { blocklist } from "./stores/block";

  import { log } from "./util/misc";
  import Feeder from "./partials/Feeder.svelte";
  import { now } from "./util/time";
  import TextNote from "./TextNote.svelte";
  import { descend, head, prop, sort } from "ramda";
  import { notifications } from "./state/app";
  import { getRootTag } from "./util/tags";
  import { deleteNodeFromTree } from "./util/misc";
  import { users } from "./stores/users";
  import { setLocalJson, setting } from "./util/storage";
  import { settings } from "./stores/settings";


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
    page.set([]);
    feed.set([]);
    if ($relays && $relays.length) {
      let lastSync = $lastSeen;
      /*if (lastSync < now() - 60 * 60) {
        lastSync = now() - 60 * 60;
      }*/

      lastSync = now() - 60 * 60;

      listener = new Listener(
        [{ since: lastSync, kinds: [0, 1, 3, 5, 7] }],
        "globalfeed"
      );
      listener.start();
      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        //contacts.getContacts($account.pubkey);
      }
    }
    $page = [];
  });

  onDestroy(() => {
    if (listener) {
      page.set([]);
      listener.stop();
      unsubscribeFeed();
      blocklistSubscribe();
      userSubscribe();
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
        updateLastSeen(head(data));
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
  const unsubscribeFeed = feed.subscribe(($feed) => {
    $feed.forEach((item) => {
      if ((item && !item.user) || item.user.name == item.pubkey) {
        let user: User | undefined = $users.find(
          (u) => u.pubkey == item.pubkey
        );
        item.user = user;
      }
      if (!item.tags.find((tag) => tag[0] === "e") && item.id && item.dirty) {
        page.update((data) => {
          if (item) {
            let note = data.find((d) => d.id == item.id);
            if (note) {
              note = item;
            }
            if (!note) {
              data.push(item);
            }
          }
          return data;
        });
        item.dirty = false;
      }
    });
    $page = sort(byCreatedAt, $page);
    updateLastSeen(head($page));
  });

  let blocklistSubscribe = blocklist.subscribe(($blocked) => {
    for (const pubkey of $blocked) {
      for (const [id, note] of Object.entries($feedStack)) {
        if (note.pubkey == pubkey && $feedStack[id]) {
          delete $feedStack[id];
        }
      };
    }
    setLocalJson(setting.Blocklist, $blocked)

    page.update(($pages) => {
      let pageData = $pages.filter((page) => {
        if ($blocked.includes(page.pubkey)) {
          return false;
        }
        if (page && page.replies.length) {
          let pageReplyData = page.replies.filter((reply) => {
            if ($blocked[reply.pubkey]) {
              return false;
            }
          });
          page.replies = pageReplyData
        }
        return true;
      })
      
      return pageData;
    });
    console.debug('Blocklist filtering')
  });

  let userSubscribe = users.subscribe(($users: Array<User>) => {
    /* for (let i = 0;i < $users.length; i++) {
      let user = $users[i]
      //if (contacts.getList().find(c => c.pubkey == user.pubkey) {

      //}
      for (let n = 0;n < Object.values($feedStack).length;  n++) {
        let fs:TextNote = Object.values($feedStack)[n];
        if (fs.pubkey == user.pubkey) {
          fs.user = user
        }
      }
    } */
    page.update((data) => data);
  });

  function handleBan(event) {
    let { id, pubkey, tree, parentId } = event.detail;
    let rootNote = $feed.find((f) => f.id == parentId);
    deleteNodeFromTree(rootNote, id);
    console.debug("BAN ", pubkey, tree);
  }


</script>

<Feeder>
  <slot>
    <ul class="items-center w-full border-hidden">
      {#each $page ? $page : [] as note (note.id)}
        {#if note.content !== "BANNED"}
          <TextNote {note} {userHasAccount} on:banUser={handleBan} />
        {/if}
      {/each}
    </ul>
  </slot>
</Feeder>
