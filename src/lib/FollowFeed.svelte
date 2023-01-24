<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get, writable } from "svelte/store";
  import { Listener } from "./state/app";
  import { descend, head, keys, pick, prop, sort, uniq, uniqBy } from "ramda";
  import { users } from "./stores/users";

  import type { TextNote as Note, Account, User } from "./state/types";
  import type { Event } from "nostr-tools";
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import { getTime, now } from "./util/time";
  import { log } from "./util/misc";
  import contacts from "./state/contacts";
  import Feeder from "./partials/Feeder.svelte";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";

  let msg = "";
  let replyTo: Event | null = null;

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

  let moreLoading = Promise<void>;
  let page = writable([]);

  let userHasAccount: boolean = false;
  let listener: Listener;
  onMount(async () => {
    if ($relays && $relays.length) {
      let lastSync: number = now() - 60 * 60 * 24 * 7;

      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        let $contacts = contacts.getList();
        if (!$contacts.length) {
          console.debug('Getting contacts')
          await contacts.getContacts($account.pubkey);
        }
        let pubkeys = [];
        
        for (let i = 0; i < $contacts.length; i++) {
          let c: { pubkey: string; relay: string; petname: string } =
            $contacts[i];
          pubkeys.push(c.pubkey);
        }
        console.debug("Contact list pubkeys", pubkeys);
        listener = new Listener(
          [{ since: lastSync, authors: pubkeys }],
          "followcontacts"
        );
        listener.start();

        console.log($feed, getTime(lastSync));
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

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    //console.log(scrollTop, scrollHeight, clientHeight);

    if (scrollTop <= 15) {
      //console.log("Should use bounce");
    }
  }

  let byCreatedAt = descend<TextNote>(prop("created_at"));
  const unsubscribeFeed = feed.subscribe(($feed) => {
    $feed.forEach((item) => {
      if ((item && !item.user) || item.user.name == item.pubkey) {
        let user: User | undefined = $users.find(
          (u) => u.pubkey == item.pubkey
        );
        if (user) {
          item.user = user;
        }
        if (!user && contacts.getList().length) {
          let contact = contacts.getList().find((c) => c.pubkey == item.pubkey);
          item.user = {
            pubkey: contact.pubkey,
            name: contact.petname,
            about: "",
            picture: "profile-placeholder.png",
            content: null,
            refreshed: now(),
          };
        }
      }

      if (!item.tags.find((tag) => tag[0] === "e") && item.id && item.dirty) {
        page.update((data) => {
          if (item) {
            console.debug("Item is: ", item);
            let note = data.find((d) => d.id == item.id);
            if (note) {
              note = item;
            }
            if (!note) {
              data.push(item);
            }
            console.debug("Item is page", data);
          }
          return data;
        });
        item.dirty = false;
      }
    });
    $page = sort(byCreatedAt, $page);
    console.debug("Page content is (sorted)", $page);
  });
</script>

<Feeder {scrollHandler} bind:msg {sendMessage}>
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
