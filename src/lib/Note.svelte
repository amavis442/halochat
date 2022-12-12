<script lang="ts">
  import { getTime } from "./util/time";
  import type { Note, Reply } from "./state/types";
  import { toHtml } from "./util/html";
  import { uniqBy, prop, values, sortBy } from "ramda";
  import type { Filter, Event, Note as NoteEvent } from "./state/types";
  import {users} from './stores/users'
  import { get } from "svelte/store";

  export let note: Note;
  
  export let index = 0;
  export let cbReply;

  let reply = note.replies;

  function normalizeName(data: Note | Reply): string {
    return (
      data.user ? (data.user.name ? data.user.name : data.pubkey) : data.pubkey
    ).slice(0, 10);
  }
  let content = toHtml(note.content);
  let replyContent = "";
  if (reply) {
    replyContent = toHtml(reply.content);
  }
  let upvote = false;
  
  let user = []
  $users = get(users)
  if (!note.user && $users[note.pubkey]) {
    note.user = $users[note.pubkey]
    user = $users[note.pubkey]
  }
</script>
<div class="Note flex flex-col items-start" data-num={index + 1}>
  {#if reply && reply.content}
    <div class="flex items-center gap-4 p-4">
      <img
        class="w-12 h-12 rounded-full"
        src={reply.user && reply.user.picture
          ? reply.user.picture
          : "profile-placeholder.png"}
        alt={reply.user ? reply.user.about : reply.pubkey}
        title={reply.user ? reply.user.name : reply.pubkey}
      />
      <div class="flex flex-col text-left">
        <strong class="text-slate-900 text-sm font-medium dark:text-slate-200">
          {normalizeName(reply)}
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
        src={user && user.picture
          ? user.picture
          : "profile-placeholder.png"}
        alt={user ? user.about : note.pubkey}
        title={user ? user.name : note.pubkey}
      />
      <div class="flex flex-col text-left">
        <strong class="text-slate-900 text-sm font-medium dark:text-slate-200">
          {normalizeName(note)}
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
