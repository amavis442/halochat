<script lang="ts">
  import { closeModal } from "svelte-modals";
  import type { TextNote } from "../../state/types";
  import Button from "../Button.svelte";
  import TextArea from "../TextArea.svelte";

  // provided by <Modals />
  export let isOpen: boolean;
  export let note: TextNote | null;
  export let onSendTextNote: Function;

  function onSubmit(e: Event) {
    const target = e.target as HTMLFormElement;
    const formData = new FormData(target);

    const data: { replyText?: string } = {};
    //@ts-ignore
    for (let field of formData) {
      const [key, value] = field;
      data[key] = value;
    }
    let v = Object.values(data);
    console.debug(v);

    closeModal();
    onSendTextNote(v[0]);
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <form on:submit|preventDefault={onSubmit}>
        {#if note}
          <h5 class="text-gray-900 text-xl font-medium mb-2">
            Re: {note.content.slice(0, 30)}
          </h5>
          <TextArea id="reply{note.id}" placeholder="Add reply" cols="30" rows="5"/>
        {:else}
          <h5 class="text-gray-900 text-xl font-medium mb-2">
            Create a new note
          </h5>
          <TextArea id="create-note" placeholder="Create a note" cols="30" rows="5"/>
        {/if}

        <div class="flex space-x-1 p-2">
          <div class="justify-items-start w-6/12">
            <Button type="submit" class="space-x-1"
              ><i class="fa-solid fa-paper-plane" />
              <span>Send</span>
            </Button>
          </div>
          <div class="w-6/12 flex justify-end">
            <Button click={closeModal} class="bg-red-500 hover:bg-red-700">Cancel</Button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;

    /* allow click-through to backdrop */
    pointer-events: none;
  }

  .contents {
    min-width: 460px;
    border-radius: 6px;
    padding: 16px;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: auto;
  }
</style>
