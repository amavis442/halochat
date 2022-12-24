<script lang="ts">
  import { fly } from "svelte/transition";

  // provided by Modals
  export let isOpen: boolean;

  function keydown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Escape") {
      isOpen = false;
    }
  }

  function open() {
    isOpen = true;
  }
  function close() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <div
    role="dialog"
    class="modal"
    transition:fly={{ y: 50 }}
    on:introstart
    on:outroend
  >
    <div class="modal-overlay fixed w-full h-full bg-gray-900 opacity-50" />

    <div class="content-wrapper">
      <div class="content">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  div.modal {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;

    /* allow click-through to backdrop */
    pointer-events: none;
  }

  div.content-wrapper {
    z-index: 10;
    max-width: 70vw;
    border-radius: 0.3rem;
    background-color: white;
    overflow: hidden;
  }

  div.content {
    min-width: 440px;
    border-radius: 6px;
    padding: 16px;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: auto;
    overflow: auto;
  }
</style>
