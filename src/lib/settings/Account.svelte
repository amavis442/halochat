<script lang="ts">
  import { account, updateAccount, deleteAccount } from "../stores/account";
  import { onMount } from "svelte";
  import { addToast } from "../partials/Toast/toast";
  import Button from "../partials/Button.svelte";
  import Text from "../partials/Text.svelte";
  import { getKeys } from "../util/keys";
  import { getData, publishAccount, relays } from "../state/pool";
  import type { User } from "../state/types";
  import type { Filter, Event } from "nostr-tools";
  import { annotateUsers } from "../stores/users";
  import { now } from "../util/time";
  import Spinner from "../partials/Spinner/Spinner.svelte";
  import { log } from "../util/misc";

  let pubkey: string;
  let privkey: string;
  let name: string;
  let about: string;
  let picture: string;

  if ($account) {
    pubkey = $account.pubkey;
    privkey = $account.privkey;
    name = $account.name;
    about = $account.about;
    picture = $account.picture;
  }

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
    let user: User = {
      pubkey: pubkey,
      about: about,
      name: name,
      picture: picture,
      content: JSON.stringify({
        name: name,
        about: about,
        picture: picture,
      }),
      relays: ["none"],
      refreshed: now(),
    };

    publishAccount();
    annotateUsers(user);

    addToast({
      message: "Account updated!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  let promise: Promise<void>;

  async function checkPubkey() {
    let filter: Filter = {
      kinds: [0],
      authors: [pubkey],
    };
    
    log("Account view:: checkPubkey filter ", filter);

    promise = getData(filter)
    .then((result: Array<Event> | null) => {
      if (result.length) {
        let data = result[0];
        const content = JSON.parse(data.content);
        name = content.name;
        about = content.about;
        picture = content.picture;
      }
      log(
        "Account view:: checkPubkey ",
        "Result: ",
        result,
        " Pubkey: ",
        pubkey
      );
    });
  }

  async function generateKeys() {
    const keys = await getKeys();
    privkey = keys.priv;
    pubkey = keys.pub;
  }

  onMount(async () => {
    if ($account) {
      name = $account.name;
      about = $account.about;
      picture = $account.picture;
    }
  });
</script>

<div
  class="block p-6 rounded-lg shadow-lg bg-white xl:w-6/12 lg:w-8/12 md:w-10/12 sm:w-full ml-6 mt-6 bg-blue-200"
>
  {#if !$relays || !$relays.length} 
  <div class="bg-red-100 rounded-lg py-5 px-6 mb-4 text-base text-red-700 mb-3" role="alert"><i class="fa-solid fa-triangle-exclamation"></i> Add a relay first!!!</div>
  {/if}

  <form on:submit|preventDefault={onSubmit}>
    <div class="form-group mb-6">
      <label for="pubKey" class="form-label inline-block mb-2 text-gray-700">
        Public key
      </label>

      <div class="md:flex md:items-top mb-6 gap-2">
        <div class="md:w-3/4">
          <Text
            bind:value={pubkey}
            id="pubkey"
            describedby="emailHelp"
            placeholder="Public key"
          />
        </div>
        <div class="md:w-1/4">
          <Button click={generateKeys}>Keys</Button>
        </div>
      </div>
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
    <div class="flex justify-end w-full gap-2">
      <div class="col-1">
        <Button type="button" click={checkPubkey}
          >Check pubkey{#await promise}
            <Spinner size={36} />
          {/await}</Button
        >
      </div>
      <div  class="col-2">
        <Button type="submit">Submit</Button>
      </div>
    </div>
  </form>
</div>

{#if $account && $account.pubkey}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
        <button on:click={() => deleteOldAccount()}>
          <span class="fa-solid fa-trash" />
        </button>
        {#if $account.name}
          {$account.name}
        {:else}
        {$account.pubkey.slice(0, 5)}....{$account.pubkey.slice(-5)}
        {/if}
      </li>
    </ul>
  </div>
{/if}
