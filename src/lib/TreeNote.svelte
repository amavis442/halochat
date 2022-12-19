<script lang="ts">
  import type { Note as NoteEvent } from "./state/types";
  import Note from "./Note.svelte";
  import { beforeUpdate, onMount } from "svelte";
  import classNames from "classnames";

  export let userHasAccount: boolean = false;
  export let notes: Array<NoteEvent>;
  export let expanded: boolean = false;
  export let num: number = 0;

  export let level: number = 0;

  function toggle() {
    expanded = !expanded;
  }

  let color = 100;
  let ulClasses = "";
  onMount(() => {});
  beforeUpdate(() => {
    color = color + level * 100;
    ulClasses = classNames(
      "border-l-indigo-600",
      "w-full border-l-8 mt-0 top-0 margin-top-0 "
    );
  });
</script>

<div class="flex flex-col">
  <div class="flex items-top gap-4 p-4 ml-16">
    <button
      class="text-white font-medium shadow visited:text-purple-600 rounded-lg bg-purple-600 p-2"
      on:click={toggle}
    >
      {#if expanded}
        Hide {num} repl{#if num == 1}y{:else}ies{/if}
      {:else}
        Show {num} repl{#if num == 1}y{:else}ies{/if}
      {/if}
    </button>
  </div>

  {#if expanded}
    <ul class={ulClasses}>
      {#each notes ? notes : [] as note (note.id)}
        <li>
          {#if note.replies.length > 0}
            <Note {note} {userHasAccount} />
            <svelte:self
              notes={note.replies}
              {userHasAccount}
              num={note.replies.length}
            />
          {:else}
            <Note {note} {userHasAccount} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .margin-top-0 {
    margin-block-start: 0px;
  }
</style>
