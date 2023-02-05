<script lang="ts">
  import { relays, publish } from "../state/pool";
  import Spinner from "./Spinner/Spinner.svelte";
  import Button from "./Button.svelte";
  import Text from "./Text.svelte";
  import Anchor from "./Anchor.svelte";
  import { openModal } from "svelte-modals";
  import CreateNoteModal from "./Modal/CreateNoteModal.svelte";

  export let msg: string;
  export let sendMessage: Function;
  export let scrollHandler: any;

  export let moreLoading = Promise<void>;

  function createTextNote() {
    openModal(CreateNoteModal, {
      note: null,
      onSendTextNote: (noteText: string) => {
        publish(1, noteText);
      },
    });
  }
</script>

<div class="flex flex-col gap-4 h-screen">
  <div class="h-screen">
    <div
      id="Notes"
      class="flex flex-col relative mx-auto bg-gray-800
            dark:highlight-white/5 shadow-lg ring-1 ring-black/5
            divide-y ml-4 mr-4
            space-y-0 place-content-start
            h-full max-h-full w-11/12"
    >
      {#if $relays && $relays.length}
        <div class="h-full w-full overflow-y-auto" on:scroll={scrollHandler}>
          <slot />
        </div>
        {#await moreLoading}
          <Spinner size={36} />
        {/await}
      {:else}
        <div class="flex h-full place-items-center">
          <div class="w-full h-24 rounded-lg p-4 text-center  bg-blue-200 mb-2">
            <h2>
              Please add a relay first. You can do this here
              <Anchor href="relays">relays</Anchor>
            </h2>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if $relays && $relays.length}
  <div class="createnote">
    <button
      on:click={createTextNote}
      class="create-note p-2 mr-4"
      title="Create a new note"
    >
      <i class="fa-regular fa-message" />
    </button>
  </div>
{/if}

<style>
  div.createnote {
    position: absolute;
    bottom: 10px;
    right: 15%;
    border: 0;
  }
  .create-note {
    height: 50px;
    width: 50px;
  }
  .create-note i {
    height: 100%;
    font-size: 60px;
    color: rgba(255, 255, 255, 0.90);
  }
</style>
