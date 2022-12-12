<script lang="ts">
  import {
    publish,
    publishReply,
    relays,
  } from "./state/pool";
  import { uniqBy, prop, values, sortBy } from "ramda";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import {
    processEvent,
    listen,
    lastTimeStamp,
    firstTimeStamp,
  } from "./state/app";
  import Note from "./Note.svelte";
  import type { Filter, Event, Note as NoteEvent } from "./state/types";
  import { account } from "./stores/account";
  import { notes } from "./stores/notes";

  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";
  
  const noteData = writable([]);
  /**
   *
   * @param myNotes
   */
  async function updateNotes(myNotes: Array<NoteEvent>) {
    if (myNotes.length) {
      noteData.update(($noteData) => {
        console.log("Update list", myNotes);
        return uniqBy(prop("id"), $noteData.concat(myNotes));
      });
      console.log("Update view with $noteData");
      $noteData = sortBy(prop("created_at"), $noteData).reverse();
    }
  }

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
  }

  function onReply(note) {
    replyTo = note;
    console.log(note);
  }

  function removeReply() {
    replyTo = null;
  }

  onMount(async () => {
    if ($relays.length) {
      let data: Array<Event> = [];

      listen();
      /*
      let noteData = await processEvent(data)
      console.log('First: ', firstTimeStamp, ', Last: ', lastTimeStamp)
      updateNotes(noteData)

      if (noteData.length < 20) {
        console.log('Need more data')

        let filter: Filter = {
          kinds: [1, 5, 7],
          until: lastTimeStamp,
          limit: 30,
        }
        data = await getData(filter)
        let pData = await processEvent(data)
        console.log(
          'First: ',
          firstTimeStamp,
          ', Last: ',
          lastTimeStamp,
          'Data: ',
          data,
          ', pData: ',
          pData,
        )
        updateNotes(pData)
      }
      */
    }
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
        {#each $notes as note, index}
          <Note {note} {index} cbReply={onReply} />
        {/each}

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
