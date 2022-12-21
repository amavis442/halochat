<script lang="ts">
  import { relays } from "./state/pool";
  import { addToast } from "./stores/toast";
  import { getLocalJson } from "./util/storage";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import { now } from "./util/time";
  import { prop, uniqBy } from "ramda";
  import type { Follow } from "./state/types";
  import { fetchUsers } from "./state/app";
  import Spinner from "./Spinner.svelte";
  import {
    followlist,
    dismissFollow,
    updateFollow,
    addFollow,
  } from "./stores/follow";

  let pubkey = "";
  let petname = "";

  function unFollow(pubkey: string) {
    dismissFollow(pubkey);

    addToast({
      message: "Unfollow: " + pubkey.slice(0, 10),
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  let promise: Promise<any>;
  async function getUsers() {
    let f: Array<Follow> = Object.values($followlist);

    let ids = [];
    for (let i = 0; i < f.length; i++) {
      ids.push(f[i].pubkey);
    }

    if (ids && ids.length) {
      promise = fetchUsers(ids, "").then((users) => {
        users = uniqBy(prop('pubkey'), users)

        users.forEach((user) => {
          console.log(
            $followlist.filter((f: Follow) => f.pubkey == user.pubkey).map((f:Follow) => {
              f.user = user
              updateFollow(f)
              return f
            })[0]
          )
        });
      });
    }
  }

  function follow() {
    let followUser: Follow = {
      pubkey: pubkey,
      petname: petname,
    };
    addFollow(followUser);

    pubkey = "";
    petname = "";

    addToast({
      message: "Following: " + pubkey.slice(0, 10),
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  /**
   * @see https://www.thisdot.co/blog/handling-forms-in-svelte
   * @param e
   */
  function onSubmit() {
    follow();
  }
</script>

<div
  class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 bg-blue-200"
>
  <form on:submit|preventDefault={onSubmit}>
    <div class="form-group mb-6">
      <label for="url" class="form-label inline-block mb-2 text-gray-700">
        Relay
      </label>
      <Text bind:value={pubkey} id="relayUrl" placeholder="pubkey" />
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

    <Button type="submit">Submit</Button>
  </form>
</div>

{#if $relays && $relays.length && $followlist && $followlist.length}
  <div
    class="block p-6 rounded-lg shadow-lg bg-white md:w-6/12 ms:w-full ml-6 mt-6 text-left bg-blue-200"
  >
    <ul class="bg-white rounded-lg border border-gray-200 w-full text-gray-900">
      {#each $followlist as follow}
        <li class="px-6 py-2 border-b border-gray-200 w-full rounded-t-lg">
          <button on:click={() => unFollow(follow.pubkey)}>
            <span class="fa-solid fa-trash" />
          </button>
          {follow?.pubkey?.slice(0, 10)}....{follow?.pubkey?.slice(-10)} ({follow.petname})
          {#if follow?.user && follow?.user?.name}
            ::metadata: {follow?.user?.name.slice(0, 10)}
          {/if}
        </li>
      {/each}
      <li class="text-right">
        <Button type="button" click={getUsers}
          >Fetch users{#await promise}
            <Spinner size={36} />
          {/await}</Button
        >
      </li>
    </ul>
  </div>
{/if}
