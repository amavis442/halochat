<script lang="ts">
  import { publish, publishReply, relays } from "./state/pool";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { Listener } from "./state/app";
  import type { Note as NoteEvent, Account } from "./state/types";
  import { account } from "./stores/account";
  import { notes } from "./stores/notes";
  import { now } from "./util/time";
  import Note from "./Note.svelte";
  import TreeNote from "./TreeNote.svelte";

  import { Modals, closeModal } from "svelte-modals";
  import Spinner from "./Spinner.svelte";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";
  import { runWorker } from "../worker";
  import Toasts from "./Toasts.svelte";

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

  let moreLoading = Promise<void>;

  let userHasAccount: boolean = false;
  let listener: Listener;
  onMount(async () => {
    runWorker();
    if ($relays.length) {
      let lastSync: number = now() - 60 * 60;
      if ($notes.length) {
        let firstNote: Note = $notes[0];
        let lastNote: Note = $notes[$notes.length - 1];
        lastSync = firstNote.created_at - 60;
        if (firstNote.created_at < lastNote.created_at) {
          lastSync = lastNote.created_at - 60;
        }
      }
      listener = new Listener({ since: lastSync, limit: 30 });
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
        class="cointainer overflow-y-auto relative max-w-full mx-auto bg-white
        dark:bg-slate-800 dark:highlight-white/5 shadow-lg ring-1 ring-black/5
        rounded-xl divide-y dark:divide-slate-200/5 ml-4 mr-4 h-full max-h-full md:w-8/12 ms:w-full bg-blue-200 mt-6 pb-5
        space-y-0 place-content-start"
        on:scroll={scrollHandler}
      >
      {#if $relays.length}
        {#each notes ? $notes : [] as note (note.id)}
          <ul>
            <li>
              <Note {note} {userHasAccount} />
              {#if note?.replies && note.replies.length > 0}
                <TreeNote
                  notes={note.replies}
                  {userHasAccount}
                  expanded={false}
                  num={note.replies.length}
                  level={1}
                />
              {/if}
            </li>
          </ul>
        {/each}

        {#await moreLoading}
          <Spinner size={36} />
        {/await}
        <footer id="footer" class="h-5" />
        {:else}
        Please add a relay first. You can do this here
        <Anchor href="relays">relays</Anchor>
      {/if}
      </div>
  </div>
  <div class="h-15p md:w-8/12 ms:w-full mt-4">
    <div
      class="block max-w-full flex justify-center bg-white
      dark:bg-slate-800 dark:highlight-white/5 shadow-lg ring-1 ring-black/5
      rounded-xl divide-y dark:divide-slate-200/5 p-2 w-full ml-4 mr-4 bg-blue-200"
    >
      {#if $relays.length && $account.privkey}
        <div class="w-4/5 mr-2">
          <Text bind:value={msg} id="msg" placeholder="Message to send" />
        </div>
        <Button type="button" click={sendMessage}>Send</Button>
      {:else}
      <p>
        To send messages, you need to add private key and have relays added. You
        can generate your private key and add them with <Anchor href="account">account</Anchor>. 
        For relays see the link
        above.
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
