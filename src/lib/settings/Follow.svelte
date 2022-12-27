<script lang="ts">
  import { relays } from "../state/pool";
  import { addToast } from "../partials/Toast/toast";
  import Button from "../partials/Button.svelte";
  import Text from "../partials/Text.svelte";
  import { prop, differenceWith, sort, ascend } from "ramda";
  import type { User } from "../state/types";
  import { fetchUser } from "../state/app";
  import Spinner from "../partials/Spinner/Spinner.svelte";
  import { users } from "../stores/users";
  import { onMount } from "svelte";
  import { account } from "../stores/account";
  import { log } from "../util/misc";
  import contacts from "../state/contacts";

  let pubkey = "";
  let petname = "";

  export function unFollow(pubkey: string) {
    followPubKeys = contacts.unFollow(pubkey);
  }

  export function follow() {
    followPubKeys = contacts.follow(pubkey, petname);
    pubkey = ''
    petname = ''
  }

  export async function saveContactList() {
    contacts.publishList(followPubKeys);
  }

  let userDiff = [];
  $: userDiff = differenceWith(
    (a: User, b: Array<string>) => a.pubkey == b[1],
    $users,
    contacts.getList()
  ).filter((u) => u.pubkey != $account.pubkey);

  let byName = ascend<User>(prop("name"));
  userDiff = sort(byName, userDiff);

  let followPubKeys = [];
  let promiseGetContacts: Promise<void>;
  onMount(async () => {
    if ($account && $account.pubkey) {
      promiseGetContacts = contacts.getContacts($account.pubkey).then((data) => {
        console.log("Got the contact list");
        followPubKeys = data
        console.log(followPubKeys, contacts.getList())
      });
    }
    console.log('Pubkeys is ', followPubKeys)
  });

  let promise: Promise<void>;
  function lookUp() {
    if (pubkey) {
      promise = fetchUser(pubkey, "").then((user) => {
        petname = user.name;
      });
    } else {
      addToast({
        message: "First fill in the pubkey i have to look up",
        type: "error",
        dismissible: true,
        timeout: 3000,
      });
    }
  }

  /**
   * @see https://www.thisdot.co/blog/handling-forms-in-svelte
   * @param e
   */
  function onSubmit() {
    saveContactList();
  }
</script>

<div
  class="block p-6 rounded-lg shadow-lg bg-white xl:w-6/12 lg:w-10/12 md:w-10/12 sm:w-full ml-6 mt-6 bg-blue-200"
>
  <div class="form-group mb-6">
    <label for="url" class="form-label inline-block mb-2 text-gray-700">
      Pubkey
    </label>
    <div class="md:flex md:items-top mb-6">
      <div class="md:w-3/4">
        <Text bind:value={pubkey} id="relayUrl" placeholder="pubkey" />
      </div>
      <div class="md:w-1/4 pl-1">
        <Button click={lookUp}>
          {#await promise}
            <Spinner size={20} />
          {/await}
          <span>search</span>
        </Button>
      </div>
    </div>
  </div>

  <div class="form-group mb-6">
    <label for="privKey" class="form-label inline-block mb-2 text-gray-700">
      Petname
    </label>
    <Text
      bind:value={petname}
      id="petname"
      describedby="petnameHelp"
      placeholder="petname"
    />
    <small id="petnameHelp" class="block mt-1 text-xs text-gray-600">
      A name so you can remember who is behind the pubkey
    </small>
  </div>
  <div class="grid pb-2 justify-items-end">
    <Button type="button" click={follow}>Add to contact list</Button>
  </div>
</div>

{#await promiseGetContacts}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <Spinner />
  </div>
{/await}

{#if $relays && $relays.length && followPubKeys && followPubKeys.length}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <form on:submit|preventDefault={onSubmit}>
      <div class="grid pb-2 justify-items-end">
        <Button type="submit">Save list</Button>
      </div>
    </form>
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      {#each followPubKeys as contact}
        <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
          <button on:click={() => unFollow(contact[1])}>
            <span class="fa-solid fa-trash" />
          </button>

          {#if contact[3]}
            <span class="font-bold">{contact[3].slice(0, 10)}</span>
          {:else}
            <span class="font-bold">{contact[1]}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if $relays && $relays.length && $users && $users.length}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200 overflow-auto h-auto"
  >
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      {#each userDiff as user}
        {#if user.name}
          <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
            <div class="flex justify-items-start text-center">
              <Button
                type="button"
                click={() => {
                  pubkey = user.pubkey;
                  petname = user.name;
                  follow();
                }}
              >
                <span class="fa-solid fa-add" />
              </Button>
              {#if user.name}
                <span class="font-bold pl-1">{user.name.slice(0, 10)}</span> -
                {#if user.about} <small>{user.about}</small>{/if}
              {/if}
            </div>
          </li>
        {/if}
      {/each}
    </ul>
  </div>
{/if}
