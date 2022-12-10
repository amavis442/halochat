<script lang="ts">
  import { account, updateAccount, deleteAccount } from '../stores/account'
  import Toasts from '../lib/Toasts.svelte'
  import { onMount } from 'svelte'
  import { addToast } from '../stores/toast'
  import Button from './partials/Button.svelte'
  import Text from './partials/Text.svelte'

  let pubkey = $account.pubkey
  let privkey = $account.privkey
  let name = $account.name
  let about = $account.about
  let picture = $account.picture

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
    /* const formData = new FormData(e.target);
    for ( let field of formData ) {
      const [key, value] = field;
    } */

    updateAccount(pubkey, privkey, name, about, picture)
    addToast({
      message: 'Account updated!',
      type: 'success',
      dismissible: true,
      timeout: 3000,
    })
  }

  onMount(() => {
    name = $account.name
    about = $account.about
    picture = $account.picture
  })
</script>

<Toasts />
<div class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6">
  <form on:submit|preventDefault={onSubmit}>
    
    <div class="form-group mb-6">
      <label for="pubKey" class="form-label inline-block mb-2 text-gray-700">
        Public key
      </label>
      <Text bind:value={pubkey} id='pubkey' describedby="emailHelp" placeholder="Public key" />
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
      <Text bind:value={privkey} id='privKey' describedby="privkeyHelp" placeholder="Private key" />
      <small id="privkeyHelp" class="block mt-1 text-xs text-gray-600">
        Keep this key private. It will be used to sign your messages. If others
        get this key, they can pretend to be you and send messages in your
        behalf.
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="myname" class="form-label inline-block mb-2 text-gray-700">
        Name
      </label>
      <Text bind:value={name} id='myname' describedby="nameHelp" placeholder="Name" />
      <small id="nameHelp" class="block mt-1 text-xs text-gray-600">
        Name to be used instead of your public key
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="aboutme" class="form-label inline-block mb-2 text-gray-700">
        About
      </label>
      <Text bind:value={about} id='aboutme' describedby="aboutHelp" placeholder="About" />
      <small id="aboutHelp" class="block mt-1 text-xs text-gray-600">
        Tell us something about you. Any hobby's, what do you like/dislike?
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="pictureofme" class="form-label inline-block mb-2 text-gray-700">
        Picture
      </label>
      <Text bind:value={picture} id='pictureofme' describedby="pictureHelp" placeholder="Picture url" />
      <small id="pictureHelp" class="block mt-1 text-xs text-gray-600">
        A nice avatar or profile picture. This is a link to a external file
        somewhere on the net. Pictures are not stored in relays.
      </small>
    </div>

    <Button type='submit'>Submit</Button>
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
