<script lang="ts">
  import { fade } from "svelte/transition";
  let showElement = false;
  export let classes = ''
</script>

<label class="{classes}">
  <a href="#/" on:click={() => showElement = !showElement} class="text-blue-600 visited:text-purple-600">
    {#if !showElement}
    <slot name="show">Show replies</slot>
    {:else}
    <slot name="hide">Hide replies</slot>
    {/if}
  </a>
</label>

{#if showElement}
  <p transition:fade="{{delay: 250, duration: 300}}">
    <slot name="content" />
  </p>
{/if}
