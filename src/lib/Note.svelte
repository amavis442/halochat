<script lang="ts">
  import { getTime } from "./util/time";
  import type { User, Note } from "./state/types";
  import { toHtml } from "./util/html";
  import { openModal } from "svelte-modals";
  import Modal from "./NoteReply.svelte";
  import { beforeUpdate, onMount } from "svelte";
  import { publish } from "./state/pool";
  import TextArea from "./partials/TextArea.svelte";
  import Button from "./partials/Button.svelte";
  import { fade } from "svelte/transition";
  import { publishReply } from "./state/pool";

  export let note: Note;
  export let userHasAccount: boolean = false;
  export let isReply: boolean = false;

  let user: User;

  beforeUpdate(async () => {});

  onMount(async () => {
    user = note?.user;
  });

  function normalizeName(data: User): string {
    return (data ? (data.name ? data.name : note.pubkey) : note.pubkey).slice(
      0,
      10
    );
  }

  async function upvoteHandler() {
    if (isReply) return;
    let tags = [
      ["p", note.pubkey],
      ["e", note.id],
    ];
    publish(7, "+", tags);
  }

  async function downvoteHandler() {
    if (isReply) return;
    let tags = [
      ["p", note.pubkey],
      ["e", note.id],
    ];
    publish(7, "-", tags);
  }

  async function onSubmit(e: Event) {
    const target = e.target as HTMLFormElement;
    const formData = new FormData(target);

    const data: { replyText?: string } = {};
    for (let field of formData) {
      const [key, value] = field;
      data[key] = value;
    }
    let v = Object.values(data);
    publishReply(v[0], note)
    showElement = false;
  }
  let showElement: boolean = false;
</script>

{#if note && note.kind == 1}
  <div class="flex items-top gap-4 p-4">
    <img
      class="w-12 h-12 rounded-full"
      src={user && user.picture ? user.picture : "profile-placeholder.png"}
      alt={user ? user.about : note.pubkey}
      title={user ? user.name : note.pubkey}
    />
    <div class="flex flex-col text-left">
      <strong class="text-slate-900 text-sm font-medium dark:text-slate-200">
        {normalizeName(user)}
        <small class="text-gray">{getTime(note.created_at)}</small>
      </strong>
      <span class="text-slate-500 text-sm font-medium dark:text-slate-400">
        {@html toHtml(note.content)}
      </span>
      {#if userHasAccount}
        <p class="mt-4 flex space-x-4 w-max p-1">
          <span>
            <button type="button" on:click={downvoteHandler}>
              <i class="fa-solid fa-thumbs-down" />
            </button>
            {note?.downvotes ? note.downvotes : 0}
          </span>
          <span>
            <button type="button" on:click={upvoteHandler}>
              <i class="fa-solid fa-thumbs-up" />
            </button>
            {note?.upvotes ? note.upvotes : 0}
          </span>
          <span>
            <button type="button" on:click={() => (showElement = !showElement)}>
              <i class="fa-regular fa-comment-dots" />
            </button>
            {#if note.replies}
              {note.replies.length}
            {/if}
          </span>
        </p>
      {/if}
    </div>
  </div>
  {#if showElement}
    <div transition:fade={{ delay: 250, duration: 300 }} class="gap-4 p-4 ml-16 w-6/12">
      <form on:submit|preventDefault={onSubmit}>
        <TextArea id="reply{note.id}" placeholder="Add reply" cols="20" />
        <div class="actions">
          <Button type="button" click={() => (showElement = !showElement)}
            >Cancel</Button
          > |
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  {/if}
{/if}
