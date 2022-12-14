<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { getContacts, loading, Listener } from "./state/app";
  import { throttle } from "throttle-debounce";
  import type { Note as NoteEvent, Account } from "./state/types";
  import { account } from "./stores/account";
  import { notes } from "./stores/notes";
  import { delay } from "./util/time";
  import { now } from "./util/time";
  import Note from "./Note.svelte";
  import { Modals, closeModal } from "svelte-modals";
  import Spinner from "./Spinner.svelte";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";

  let msg = "";
  let replyTo: NoteEvent | null = null;

  function sendMessage() {
    if (replyTo) {
      console.log(replyTo);
      publishReply(msg, replyTo);
    }
    if (!replyTo) {
      publish(1, msg);
    }
    replyTo = null;
    msg = "";
  }

  const throttleFunc = throttle(5000, () => {
    console.log("Bouncy");
    loading.set(true);
    getContacts();
  });

  let page = 0;
  let action = "";
  loading.subscribe((value) => {
    if (!value && page > 1 && action != "contacts") {
      delay(500); // Just to be sure and fire once with debounce
      throttleFunc();
      action = "contacts";
    }
  });

  let userHasAccount: boolean = false;
  let listener: Listener;
  onMount(async () => {
    if ($relays.length) {
      listener = new Listener({ since: now() - 4 * 60 * 60 });
      listener.start();

      let $account: Account = get(account);
      if ($account.pubkey) {
        userHasAccount = true;
      }
    }
  });

  onDestroy(() => {
    if (listener) {
      listener.stop();
    }
  });

  afterUpdate(async () => {
    page++;
  });
</script>

<div class="flex flex-col gap-4 h-screen">
  <div class="h-85p">
    {#if $relays.length}
      <div
        id="Notes"
        class="cointainer overflow-y-auto relative max-w-full mx-auto bg-white
        dark:bg-slate-800 dark:highlight-white/5 shadow-lg ring-1 ring-black/5
        rounded-xl divide-y dark:divide-slate-200/5 ml-4 mr-4 h-full max-h-full"
      >
        {#each notes ? $notes : [] as n (n.id)}
          <div class="Note flex flex-col items-start">
            <Note note={n} {userHasAccount} />
            {#if n?.replies}
              {#each n.replies as reply (reply.id)}
                <div class="reply border-l-4 border-indigo-500/100">
                  <Note note={reply} {userHasAccount} />
                </div>
              {/each}
            {/if}
          </div>
        {/each}
        {#if $loading}
          <Spinner />
        {/if}
        <footer id="footer" class="h-5" />
      </div>
    {:else}
      Please add an relay first. You can do this here
      <Anchor href="relays">relays</Anchor>
    {/if}
  </div>
  <div class="h-15p">
    {#if $relays.length && $account.privkey}
      <div class="block max-w-full flex justify-center">
        <div class="w-4/5 mr-2">
          <Text bind:value={msg} id="msg" placeholder="Message to send" />
        </div>
        <Button type="button" click={sendMessage}>Send</Button>
      </div>
    {:else}
      To send messages, you need to add private key and have relays added. You
      can generate your private key and add them here. For relays see the link
      above.
      <Anchor href="account">account</Anchor>
    {/if}
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
