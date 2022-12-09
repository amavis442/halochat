<script lang="ts">
  import { account, addAccount, deleteAccount } from '../stores/account'
  import Toasts from '../lib/Toasts.svelte'
  import { onMount } from 'svelte'
  import { addToast } from '../stores/toast'

  let pubkey = $account.pubkey
  let privkey = $account.privkey
  let name = $account.name
  let about = $account.about
  let picture = $account.picture

  function addNewAccount() {
    addAccount(pubkey, privkey, name, about, picture)
    addToast({
      message: 'Account updated!',
      type: 'success',
      dismissible: true,
      timeout: 3000,
    })
  }

  /**

   * @param pubkey
   */
  function deleteOldAccount(pubkey: string) {
    deleteAccount(pubkey)
  }

  /**
   * @see https://www.thisdot.co/blog/handling-forms-in-svelte
   * @param e
   */
  function onSubmit(e) {
    addNewAccount()
  }

  onMount(() => {
    name = $account.name
    about = $account.about
    picture = $account.picture
  })
</script>

<Toasts />
{JSON.stringify($account)}
<div class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6">
  <form on:submit|preventDefault={onSubmit}>
    <div class="form-group mb-6">
      <label for="pubKey" class="form-label inline-block mb-2 text-gray-700">
        Public key
      </label>
      <input
        type="text"
        bind:value={pubkey}
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none"
        id="pubKey"
        aria-describedby="emailHelp"
        placeholder="Public key" />
      <small id="pubkeyHelp" class="block mt-1 text-xs text-gray-600">
        This is you username for nostr. You can add more info like name,about
        and picture which most clients will pickup and show that instead of you
        pubkey.
      </small>
    </div>
    <div class="form-group mb-6">
      <label for="privKey" class="form-label inline-block mb-2 text-gray-700">
        Private key
      </label>
      <input
        type="text"
        bind:value={privkey}
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none"
        id="privKey"
        placeholder="Private key" />
      <small id="privkeyHelp" class="block mt-1 text-xs text-gray-600">
        Keep this key private. It will be used to sign your messages. If others
        get this key, they can pretend to be you and send messages in your
        behalf.
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="privKey" class="form-label inline-block mb-2 text-gray-700">
        Name
      </label>
      <input
        type="text"
        bind:value={name}
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none"
        id="name"
        placeholder="Name" />
      <small id="nameHelp" class="block mt-1 text-xs text-gray-600">
        Name to be used instead of your public key
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="about" class="form-label inline-block mb-2 text-gray-700">
        About
      </label>
      <input
        type="text"
        bind:value={about}
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none"
        id="about"
        placeholder="About" />
      <small id="aboutHelp" class="block mt-1 text-xs text-gray-600">
        Tell us something about you. Any hobby's, what do you like/dislike?
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="picture" class="form-label inline-block mb-2 text-gray-700">
        Picture
      </label>
      <input
        type="text"
        bind:value={picture}
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none"
        id="picture"
        placeholder="Picture url" />
      <small id="pictureHelp" class="block mt-1 text-xs text-gray-600">
        A nice avatar or profile picture. This is a link to a external file
        somewhere on the net. Pictures are not stored in relays.
      </small>
    </div>

    <button
      type="submit"
      class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
      leading-tight uppercase rounded shadow-md hover:bg-blue-700
      hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
      focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
      ease-in-out opacity-100">
      Submit
    </button>
  </form>
</div>

{#if $account.pubkey}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6 text-left">
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
        <button on:click={() => deleteOldAccount($account.pubkey)}>
          <span class="fa-solid fa-trash" />
        </button>
        {$account.pubkey}
      </li>
    </ul>
  </div>
{/if}
