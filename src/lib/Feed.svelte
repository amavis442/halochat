<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, beforeUpdate, onDestroy } from "svelte";
  import { get, writable } from "svelte/store";
  import { Listener } from "./state/app";
  import type { TextNote as NoteEvent, Account } from "./state/types";
  import { account } from "./stores/account";
  import { feed } from "./state/app";
  import contacts from "./state/contacts";
  import { now } from "./util/time";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";

  import { Modals, closeModal } from "svelte-modals";
  import Spinner from "./Spinner.svelte";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";
  import Toasts from "./Toasts.svelte";
  import { log } from "./util/misc";
  
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
      let lastSync: number = now() - 60 * 60;
      listener = new Listener({ since: lastSync });
      listener.start();

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

<Toasts />
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
        {#each $feed ? $feed : [] as note (note.id)}
          <ul class="items-center w-full border-hidden">
            <li>
              <div
                class="flex flex-col items-top gap-4 p-2 w-full overflow-hidden rounded-lg bg-blue-200 mb-2"
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
  <div class="h-15p mt-4">
    <div
      class="block flex justify-center bg-white
      dark:bg-slate-800 dark:highlight-white/5 shadow-lg ring-1 ring-black/5
      rounded-xl divide-y dark:divide-slate-200/5 p-2 ml-4 mr-4 bg-blue-200 
      w-11/12"
    >
      {#if $relays && $account && $relays.length && $account.privkey}
        <div class="w-4/5 mr-2">
          <Text bind:value={msg} id="msg" placeholder="Message to send" />
        </div>
        <Button type="button" click={sendMessage}>Send</Button>
      {:else}
        <p>
          To send messages, you need to add private key and have relays added.
          You can generate your private key and add them with <Anchor
            href="account">account</Anchor
          >. For relays see the link above.
        </p>
      {/if}
    </div>
  </div>
</div>

<Modals>
  <div
    slot="backdrop"
    class="backdrop"
    on:click={closeModal}
    on:keyup={closeModal}
  />
</Modals>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.5);
  }
</style>
