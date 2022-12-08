<script lang="ts">
  import { account, addAccount, deleteAccount } from '../stores/account'
  import Toasts from '../lib/Toasts.svelte'

  let pubkey = $account.pubkey
  let privkey = $account.privkey

  function addNewAccount() {
    addAccount(pubkey, privkey)
    pubkey = ''
    privkey = ''
  }

  function deleteOldAccount(pubkey: string) {
    deleteAccount(pubkey)
    pubkey = ''
    privkey = ''
  }
</script>

<Toasts />

<form class="w-full max-w-sm">
  <div class="md:flex md:items-center mb-6">
    <div class="md:w-1/3">
      <label
        class="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
        for="inline-relay">
        Pubkey
      </label>
    </div>
    <div class="md:w-2/3">
      <input
        bind:value={pubkey}
        id="inline-relay"
        class="bg-gray-200 appearance-none border-2 border-gray-200 rounded
        w-full py-2 px-4 text-black leading-tight focus:outline-none
        focus:bg-white focus:border-purple-500"
        type="text"
        placeholder="pubkey" />
    </div>
  </div>

  <div class="md:flex md:items-center mb-6">
    <div class="md:w-1/3">
      <label
        class="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
        for="inline-relay">
        Privkey
      </label>
    </div>
    <div class="md:w-2/3">
      <input
        bind:value={privkey}
        id="inline-relay"
        class="bg-gray-200 appearance-none border-2 border-gray-200 rounded
        w-full py-2 px-4 text-black leading-tight focus:outline-none
        focus:bg-white focus:border-purple-500"
        type="text"
        placeholder="privkey" />
    </div>
  </div>

  <div class="md:flex md:items-center">
    <div class="md:w-1/3" />
    <div class="md:w-2/3">
      <button
        class="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline
        focus:outline-none text-black font-bold py-2 px-4 rounded"
        type="button"
        on:click={addNewAccount}>
        Add
      </button>
    </div>
  </div>
</form>
{#if $account.pubkey}
  {$account.pubkey}
  <button on:click={() => deleteOldAccount($account.pubkey)}>
    <span class="fa-solid fa-trash" />
  </button>
{/if}
