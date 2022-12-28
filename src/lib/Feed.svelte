<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { Listener, lastSeen } from "./state/app";
  import type { TextNote as NoteEvent, Account } from "./state/types";
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import contacts from "./state/contacts";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";

  import Spinner from "./partials/Spinner/Spinner.svelte";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";
  import { log } from "./util/misc";
  import Feeder from './Feeder.svelte';
  import { getTime } from "./util/time";

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

  onMount(async () => {
    if ($relays && $relays.length) {
      listener = new Listener({ since: $lastSeen }, "globalfeed");
      listener.start();
      console.log('Last seen:', getTime($lastSeen))

      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
        contacts.getContacts($account.pubkey);
      }
    }
  });

  onDestroy(() => {
    if (listener) {
      feed.set([]);
      listener.stop();
    }
  });

  function scrollHandler(e: any) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      //debounceFunc();
    }
  }
</script>

<Feeder
  bind:msg={msg}
  {scrollHandler}
  {sendMessage}
  {userHasAccount}
/>
