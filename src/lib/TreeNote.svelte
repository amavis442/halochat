<script lang="ts">
  import type { Note as NoteEvent } from "./state/types";
  import Note from "./Note.svelte";
  import { beforeUpdate, onMount } from "svelte";

  export let userHasAccount: boolean = false;
  export let notes: Array<NoteEvent>;
  export let expanded: boolean = false;
  export let num: number = 0;
  export let level: number = 1;
  function toggle() {
    expanded = !expanded;
  }

  let color = 100;
  let border = "";
  onMount(() => {});
  beforeUpdate(() => {
    level = level + 1;
    color = color + level * 100;
    border = "border-l-4 border-l-indigo-" + color + "/100";
  });
</script>

<div class="flex items-top gap-4 p-4 ml-16">
  <button class="text-blue-600 visited:text-purple-600" on:click={toggle}>
    {#if expanded}
      Hide {num} repl{#if num == 1}y{:else}ies{/if}
    {:else}
      Show {num} repl{#if num == 1}y{:else}ies{/if}
    {/if}
  </button>
</div>

{#if expanded}
  <ul class={border}>
    {#each notes ? notes : [] as note (note.id)}
      <li>
        {#if note.replies.length > 0}
          <Note {note} {userHasAccount} />

          <svelte:self
            notes={note.replies}
            {userHasAccount}
            num={note.replies.length}
            {level}
          />
        {:else}
          <Note {note} {userHasAccount} />
        {/if}
      </li>
    {/each}
  </ul>
{/if}
