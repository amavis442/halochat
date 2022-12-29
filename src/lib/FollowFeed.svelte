<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { Listener } from "./state/app";
 
  import type { TextNote as Note, Account } from "./state/types";
  import type { Event } from 'nostr-tools'
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import { getTime, now } from "./util/time";
  import { log } from "./util/misc";
  import contacts from './state/contacts';
  import Feeder from './partials/Feeder.svelte';
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

  let userHasAccount: boolean = false;
  let listener: Listener;
  onMount(async () => {
    feed.set([])
    
    if ($relays && $relays.length) {
      let lastSync: number = now() - 60 * 60 * 24 * 7;
      if ($feed && $feed.length) {
        let firstNote: Note = $feed[0];
        let lastNote: Note = $feed[$feed.length - 1];
        lastSync = firstNote.created_at - 60;
        if (firstNote.created_at < lastNote.created_at) {
          lastSync = lastNote.created_at - 60;
        }
      }

      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        if (!contacts.getList().length) {
          await contacts.getContacts($account.pubkey)
        }
        let pubkeys = []
        contacts.getList().forEach(c => {
          pubkeys.push(c[1])
        })
        listener = new Listener({ since: lastSync, limit: 500, authors: pubkeys }, 'followcontacts');
        listener.start();

        console.log($feed, getTime(lastSync))
      }
    }
    
  });

  onDestroy(() => {
    if (listener) {
      feed.set([]);
      listener.stop();
    }
  });
</script>

<Feeder scrollHandler={() => { console.log('Scroll')}} bind:msg {sendMessage}>
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
