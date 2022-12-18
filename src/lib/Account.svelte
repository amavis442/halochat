<script lang="ts">
  import { account, updateAccount, deleteAccount } from "./stores/account";
  import Toasts from "./Toasts.svelte";
  import { onMount } from "svelte";
  import { addToast } from "./stores/toast";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import { getKeys } from "./util/keys";
  import { channels, publishAccount } from "./state/pool";
  import type { Filter, Event, User } from './state/types'
  import { addUser } from "./stores/users";
  import { now } from "./util/time";

  let pubkey: string = $account.pubkey;
  let privkey: string = $account.privkey;
  let name: string = $account.name;
  let about: string = $account.about;
  let picture: string = $account.picture;

  /**

   * @param pubkey
   */
  async function deleteOldAccount() {
    deleteAccount();
    name = "";
    about = "";
    picture = "";
    const keys = await getKeys();
    if (!(privkey && pubkey)) {
      privkey = keys.priv;
      pubkey = keys.pub;
    }
  }

  /**
   * @see https://www.thisdot.co/blog/handling-forms-in-svelte
   * @param e
   */
  function onSubmit() {
    if (name) {
      name = name.trim();
      if (name && !name.match(/^\w[\w\-]+\w$/i)) {
        addToast({
          message:
            "Account name not correct! George-Washington-1776 is a valid <username>, but George Washington is not",
          type: "error",
          dismissible: true,
          timeout: 3000,
        });
        return;
      }
    }
    updateAccount(pubkey, privkey, name, about, picture);
    let user:User
    user.about = about
    user.name = name
    user.picture = picture
    user.content = JSON.stringify({name:name, about:about,picture:picture})
    user.pubkey = pubkey
    user.relays = ['none']
    user.refreshed = now()
    
    publishAccount();
    addUser(user, true)

    addToast({
      message: "Account updated!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  async function checkPubkey() {
    let filter:Filter = {
      kinds: [0],
      authors: [pubkey]
    }
    let result:Array<Event> = await channels.getter.all(filter)
    if (result.length)
    {
      let data = result[0]
      const content = JSON.parse(data.content);
      name = content.name
      about = content.about
      picture = content.picture
    }
    console.log(result, pubkey)
  }


  onMount(async () => {
    name = $account.name;
    about = $account.about;
    picture = $account.picture;

    const keys = await getKeys();
    if (!(privkey && pubkey)) {
      privkey = keys.priv;
      pubkey = keys.pub;
    }
  });
</script>

<Toasts />
<div class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 bg-blue-200">
  <form on:submit|preventDefault={onSubmit}>
    <div class="form-group mb-6">
      <label for="pubKey" class="form-label inline-block mb-2 text-gray-700">
        Public key
      </label>
      <Text
        bind:value={pubkey}
        id="pubkey"
        describedby="emailHelp"
        placeholder="Public key"
      />
      <small id="pubkeyHelp" class="block mt-1 text-xs text-gray-600">
        This is your username for nostr. You can add more info like name, about
        and a picture which most clients will pickup and show that instead of
        your pubkey.
      </small>
    </div>
    <div class="form-group mb-6">
      <label for="privKey" class="form-label inline-block mb-2 text-gray-700">
        Private key
      </label>
      <Text
        bind:value={privkey}
        id="privKey"
        describedby="privkeyHelp"
        placeholder="Private key"
      />
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
      <Text
        bind:value={name}
        id="myname"
        describedby="nameHelp"
        placeholder="Name"
      />
      <small id="nameHelp" class="block mt-1 text-xs text-gray-600">
        Name to be used instead of your public key
      </small>
    </div>

    <div class="form-group mb-6">
      <label for="aboutme" class="form-label inline-block mb-2 text-gray-700">
        About
      </label>
      <Text
        bind:value={about}
        id="aboutme"
        describedby="aboutHelp"
        placeholder="About"
      />
      <small id="aboutHelp" class="block mt-1 text-xs text-gray-600">
        Tell us something about you. Any hobby's, what do you like/dislike?
      </small>
    </div>

    <div class="form-group mb-6">
      <label
        for="pictureofme"
        class="form-label inline-block mb-2 text-gray-700"
      >
        Picture
      </label>
      <Text
        bind:value={picture}
        id="pictureofme"
        describedby="pictureHelp"
        placeholder="Picture url"
      />
      <small id="pictureHelp" class="block mt-1 text-xs text-gray-600">
        A nice avatar or profile picture. This is a link to an external file
        somewhere on the net. Pictures are not stored in relays.
      </small>
    </div>
    <Button type="button" click={checkPubkey}>Check pubkey</Button> | 
    <Button type="submit">Submit</Button>
  </form>
</div>

{#if $account.pubkey}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
        <button on:click={() => deleteOldAccount()}>
          <span class="fa-solid fa-trash" />
        </button>
        {$account.pubkey.slice(0, 5)}....{$account.pubkey.slice(-5)}
      </li>
    </ul>
  </div>
{/if}
