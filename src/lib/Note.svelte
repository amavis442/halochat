<script lang="ts">
  import { getTime } from "./util/time";
  import type { User, Note } from "./state/types";
  import { toHtml } from "./util/html";
  import { openModal } from "svelte-modals";
  import Modal from "./NoteReply.svelte";
  import { onMount } from "svelte";

  export let note: Note;
  export let isReply: boolean = false;
  export let userHasAccount:boolean = false;

  let upvote: boolean = false;
  let user: User;
  let hasReplies: boolean = false;
  let replyClass: string = "";

  onMount(() => {
    if (isReply || hasReplies) {
      replyClass = "border-l-4 border-indigo-500 border-b-0";
    }
    user = note?.user
  });

  function normalizeName(data: User): string {
    return (data ? (data.name ? data.name : note.pubkey) : note.pubkey).slice(
      0,
      10
    );
  }

  function handleReplyClick() {
    openModal(Modal, { title: note.content.slice(0, 20), note: note });
  }
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
      <span>
        <button type="button" on:click={handleReplyClick}>
          <i class="fa-regular fa-comment-dots" />
        </button>

        {#if upvote}
          <button type="button">
            <i class="fa-solid fa-thumbs-up" />
          </button>
        {:else}
          <button type="button">
            <i class="fa-regular fa-thumbs-up" />
          </button>
        {/if}
      </span>
      {/if}
    </div>
  </div>
{/if}
