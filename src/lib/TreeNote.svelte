<script lang="ts">
  import type { TextNote as NoteEvent } from "./state/types";
  import TextNote from "./TextNote.svelte";
  import { beforeUpdate, onMount } from "svelte";
  import classNames from "classnames";
  import Button from "./partials/Button.svelte";

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
    <Button click={toggle}>
      {#if expanded}
        Hide {num} repl{#if num == 1}y{:else}ies{/if}
      {:else}
        Show {num} repl{#if num == 1}y{:else}ies{/if}
      {/if}
    </Button>
  </div>

  {#if expanded}
    <ul class={ulClasses}>
      {#each notes ? notes : [] as note (note.id)}
        <li>
          {#if note.replies && note.replies.length > 0}
            <TextNote {note} {userHasAccount} />
            <svelte:self
              notes={note.replies}
              {userHasAccount}
              num={note.replies.length}
            />
          {:else}
            <TextNote {note} {userHasAccount} />
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
