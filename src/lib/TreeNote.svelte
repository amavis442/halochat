<script lang="ts">
  import type { Note as NoteEvent } from "./state/types";
  import Note from "./Note.svelte";
  import { onMount } from "svelte";

  export let userHasAccount: boolean = false;
  export let notes: Array<NoteEvent>;
  export let expanded: boolean = false;
  export let num: number = 0;
  export let level:number = 1;
  function toggle() {
    expanded = !expanded;
  }

  let color  = 100
  onMount(()=>{
    level = level + 1
    color = color + level * 100
  })
</script>

<button class:expanded on:click={toggle}>
  {#if expanded}
    Hide {num} repl{#if num == 1}y{:else}ies{/if}
  {:else}
    Show {num} repl{#if num == 1}y{:else}ies{/if}
  {/if}
</button>

{#if expanded}
  <ul class="border-l-4 border-l-indigo-{color}/100">
    {#each notes ? notes : [] as note (note.id)}
      <li>
        {#if note.replies.length > 0}
        {level}  
        <Note {note} {userHasAccount} />

          <svelte:self notes={note.replies} {userHasAccount} num={note.replies.length} level={level} />
        {:else}
        {level}
          <Note {note} {userHasAccount} />
        {/if}
      </li>
    {/each}
  </ul>
{/if}
