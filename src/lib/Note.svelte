<script lang="ts">
  import { getTime } from "./util/time";
  import type { Note } from "./state/types";
  import { toHtml } from "./util/html";
  import { uniqBy, prop, values, sortBy } from "ramda";
  import type { User, Filter, Event, Note as NoteEvent } from "./state/types";
  import { users } from "./stores/users";
  import { notes } from "./stores/notes";

  import { get } from "svelte/store";

  export let note: Note;
  export let cbReply;

  $users = get(users);

  let reply: Note;
  let replyUser;
  if (note.reply_id) {
    const $notes = get(notes);
    reply = $notes.find((n) => n.id == note.reply_id);
    if (reply) {
      replyUser = $users.find((u) => u.pubkey == reply.pubkey);
    }
  }
  let replyContent = "";
  if (reply) {
    replyContent = toHtml(reply.content);
  }

  let noteUser = $users.find((u) => u.pubkey == note.pubkey);
  let content = toHtml(note.content);

  function normalizeName(data: User): string {
    return (
      data ? (data.name ? data.name : note.pubkey) : note.pubkey
    ).slice(0, 10);
  }

  let upvote: boolean = false;
</script>

<div class="Note flex flex-col items-start">
  {#if reply && reply.content}
    <div class="flex items-center gap-4 p-4">
      <img
        class="w-12 h-12 rounded-full"
        src={replyUser && replyUser.picture
          ? replyUser.picture
          : "profile-placeholder.png"}
        alt={replyUser ? replyUser.about : reply.pubkey}
        title={replyUser ? replyUser.name : reply.pubkey}
      />
      <div class="flex flex-col text-left">
        <strong class="text-slate-900 text-sm font-medium dark:text-slate-200">
          {normalizeName(replyUser)}
          <small class="text-gray">{getTime(reply.created_at)}</small>
        </strong>
        <span class="text-slate-500 text-sm font-medium dark:text-slate-400">
          {@html replyContent}
        </span>
      </div>
    </div>
  {/if}
  {#if note.kind == 1}
    <div class="flex items-top gap-4 p-4">
      <img
        class="w-12 h-12 rounded-full"
        src={noteUser && noteUser.picture
          ? noteUser.picture
          : "profile-placeholder.png"}
        alt={noteUser ? noteUser.about : note.pubkey}
        title={noteUser ? noteUser.name : note.pubkey}
      />
      <div class="flex flex-col text-left">
        <strong class="text-slate-900 text-sm font-medium dark:text-slate-200">
          {normalizeName(noteUser)}
          <small class="text-gray">{getTime(note.created_at)}</small>
        </strong>
        <span class="text-slate-500 text-sm font-medium dark:text-slate-400">
          {@html content}
        </span>
        <span>
          <button type="button" on:click={() => cbReply(note)}>
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
      </div>
    </div>
  {/if}
</div>
