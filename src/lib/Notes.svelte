<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { uniqBy, prop, sortBy } from "ramda";
  import { onMount, afterUpdate } from "svelte";
  import { writable } from "svelte/store";
  import { listen, getContacts, loading } from "./state/app";
  import { throttle } from "throttle-debounce";
  import type { Note as NoteEvent } from "./state/types";
  import { account } from "./stores/account";
  import { notes } from "./stores/notes";
  import { users } from "./stores/users";
  import { delay } from "./util/time";

  import Note from "./Note.svelte";
  import Spinner from "./Spinner.svelte";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";
  //import { setLocalJson,getLocalJson } from './util/storage'
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
    msg = ''
  }

  function onReply(note) {
    replyTo = note;
    console.log(note);
  }

  function removeReply() {
    replyTo = null;
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

  onMount(async () => {
    if ($relays.length) {
      /** Reset data
      users.set([])
      setLocalJson('halonostr/users', [])
      notes.set([])
      setLocalJson('halonostr/notes', [])
      */

      const subscription = listen(250);
      
      //users.set([])
      //delay(500)
      //getContacts(10);
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
        {#if $notes.length}
          {#each $notes as note}
            <Note {note} cbReply={onReply} />
          {/each}
        {/if}
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
          {#if replyTo}
            <button on:click={removeReply}>
              Reply to {replyTo.content.slice(0, 10)}
            </button>
          {/if}
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
