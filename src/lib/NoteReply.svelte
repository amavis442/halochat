<script lang="ts">
  import { closeModal } from "svelte-modals";
  import Button from "./partials/Button.svelte";
  import TextArea from "./partials/TextArea.svelte";
  import type { Note } from "./state/types";
  import { publishReply } from "./state/pool";

  // provided by Modals
  export let isOpen:boolean;

  export let title: string;
  export let note: Note;

  async function onSubmit(e:Event) {
    const target = e.target as HTMLFormElement;
    const formData = new FormData(target);

    const data:{replyText?: string} = {};
    for (let field of formData) {
      const [key, value] = field;
      data[key] = value;
    }

    await publishReply(data.replyText, note)
    closeModal()
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <h2>Reply to: {title}...</h2>
      <form on:submit|preventDefault={onSubmit}>
        <p><TextArea id="replyText" rows="5" /></p>
        <div class="actions">
          <Button type="button" click={closeModal}>Cancel</Button> |
          <Button type="submit">Send</Button>
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

    /* allow click-through to backdrop */
    pointer-events: none;
  }

  .contents {
    min-width: 440px;
    border-radius: 6px;
    padding: 16px;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: auto;
  }

  h2 {
    text-align: center;
    font-size: 24px;
  }

  p {
    text-align: center;
    margin-top: 16px;
  }

  .actions {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
  }
</style>
