<script>
  import { createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'

  const dispatch = createEventDispatcher()

  export let type = 'error'
  export let dismissible = true
</script>

<style lang="postcss">
  article {
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.2rem;
    display: flex;
    align-items: center;
    margin: 0 auto 0.5rem auto;
    width: 30rem;
  }
  .error {
    background: IndianRed;
  }
  .success {
    background: MediumSeaGreen;
  }
  .info {
    background: SkyBlue;
  }
  .text {
    margin-left: 1rem;
  }
  button {
    color: white;
    background: transparent;
    border: 0 none;
    padding: 0;
    margin: 0 0 0 auto;
    line-height: 1;
    font-size: 1rem;
  }
</style>

<article class={type} role="alert" transition:fade>
  {#if type === 'success'}
    <i class="fa-regular fa-circle-check" />
  {:else if type === 'error'}
    <i class="fa-regular fa-circle-exclamation" />
  {:else}
    <i class="fa-regular fa-circle-info" />
  {/if}

  <div class="text">
    <slot />
  </div>

  {#if dismissible}
    <button class="close" on:click={() => dispatch('dismiss')}>
      <i class="fa-regular fa-circle-xmark" />
    </button>
  {/if}
</article>
