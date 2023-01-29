<script lang="ts">
  import { getTime } from "./util/time";
  import type { User, TextNote as Note, Reaction } from "./state/types";
  import { toHtml, findLink } from "./util/html";
  import { beforeUpdate, onMount } from "svelte";
  import { publishReaction } from "./state/pool";
  import { publishReply } from "./state/pool";
  import { account } from "./stores/account";
  import { pluck, uniqBy, prop } from "ramda";
  import { blocklist } from "./stores/block";
  import { now } from "./util/time";
  import { addToast } from "./partials/Toast/toast";
  import { users } from "./stores/users";
  import { feedStack, feed, mute } from "./state/app";
  import Preview from "./partials/Preview/Preview.svelte";
  import { openModal } from "svelte-modals";
  import UserModal from "./partials/Modal/UserModal.svelte";
  import CreateNoteModal from "./partials/Modal/CreateNoteModal.svelte";

  import Spinner from "./partials/Spinner/Spinner.svelte";
  import contacts from "./state/contacts";
  import { createEventDispatcher } from "svelte";

  export let note: Note | any; // Todo: Do not know how to type this correctly to make sure in Notes it does not say Note__SvelteComponent_ <> Note type, very annoying
  export let userHasAccount: boolean = false;

  let user: User;
  let votedFor: string = "";
  let link: string | null = null;
  const dispatch = createEventDispatcher();
  let upvotes: number;
  let downvotes: number;

  $: upvotes = 0;
  $: downvotes = 0;

  beforeUpdate(() => {
    if (note.reactions && $account) {
      upvotes = 0;
      downvotes = 0;
      note.reactions.forEach((reaction: Reaction) => {
        if (reaction.content == "+" || reaction.content == "")
          upvotes = upvotes + 1;
        if (reaction.content == "-") downvotes = downvotes + 1;
      });

      //@ts-ignore
      let pubkeys = pluck("pubkey", note.reactions);
      let fp = pubkeys.find((pk) => pk == $account.pubkey);
      if (fp) {
        let voted = note.reactions.find(
          (r: Reaction) => r.pubkey == $account.pubkey
        );
        votedFor = voted.content;
      }
    }
  });

  onMount(async () => {
    user = note?.user;
    link = findLink(note.content);
  });

  function normalizeName(data: User): string {
    return (data ? (data.name ? data.name : note.pubkey) : note.pubkey).slice(
      0,
      10
    );
  }

  async function upvoteHandler() {
    upvotes = upvotes + 1;
    publishReaction("+", note);
  }

  async function downvoteHandler() {
    downvotes = downvotes + 1;
    publishReaction("-", note);
  }

  /**
   * Send a textnote as reply
   */
  let promiseReply: Promise<void>;
  async function sendTextNote(noteText: string) {
    console.log(noteText);
    promiseReply = publishReply(noteText, note);
  }

  async function banUser() {
    expanded = false;

    if (!$blocklist) $blocklist = [];
    $blocklist.push({ pubkey: note.pubkey, added: now() });
    $blocklist = uniqBy(prop("pubkey"), $blocklist);

    let user: User = $users.find((u) => (u.pubkey = note.pubkey));
    user.name = user.name + "[BLOCKED]";
    users.update((data) => data); // Hopes this triggers the view


    feedStack.update((data) => {
      Object.values(data).forEach((item: Note) => {
        if (item.pubkey == note.pubkey) {
          item.content = "BANNED";
        }
      });
      return data;
    });

    addToast({
      message: "User " + note.pubkey.slice(0, 10) + " blocked!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  function isFollowed(): boolean {
    if (contacts.getList().find((c) => c.pubkey == note.pubkey)) {
      return true;
    }
    return false;
  }

  let followed = false;
  $: followed = isFollowed();

  async function followUser() {
    if (!user.name) {
      addToast({
        message:
          "User " +
          note.pubkey.slice(0, 10) +
          " has no name to set as petname. Can't be followed yet!",
        type: "warning",
        dismissible: true,
        timeout: 3000,
      });
      return;
    }
    contacts.follow(note.pubkey, user.name);
    contacts.publishList();
    followed = true;
  }

  function unfollowUser() {
    expanded = false;

    let c = contacts.unFollow(note.pubkey);
    console.log(c);
    contacts.publishList();
    followed = false;
  }

  function removeNote() {
    expanded = false;
    mute.update((data) => {
      if (!data) {
        data = [];
      }
      data.push(note.id);
      console.log("Mute ", data);
      return data;
    });

    addToast({
      message: "Note " + note.id.slice(0, 10) + " has been muted!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  let borderColor = "border-indigo-" + (note.tree * 100 + 400);

  export let expanded: boolean = false;
  function toggleMenu() {
    expanded = !expanded;
  }

  function userInfo() {
    openModal(UserModal, {
      note: note,
      followed: followed,
      onFollowUser: () => {
        followUser();
      },
      onUnfollowUser: () => {
        unfollowUser();
      },
    });
  }

  function createTextNote() {
    openModal(CreateNoteModal, {
      note: note,
      onSendTextNote: (noteText: string) => {
        sendTextNote(noteText);
      },
    });
  }

  function align() {
    if (note.tree == 0) return "";
    /*
    if (note.tree == 1) return "ml-2";
    if (note.tree == 2) return "ml-4";
    if (note.tree > 2) return "ml-6";
    */
  }

  let repliesExpanded: boolean = false;
  function toggleReplies() {
    repliesExpanded = !repliesExpanded;
  }

  note.replies = uniqBy(prop('id'), note.replies)
  $: user = note.user;
</script>

{#await promiseReply}
  <Spinner />
{/await}

{#if note && note.kind == 1}
  <div
    id={note.id}
    class="flex flex-row w-full min-h-full {align()} items-top gap-2 mb-2 overflow-y-auto bg-white rounded-lg p-1 border-l-4 border-t-2 {borderColor} {$$props[
      'class'
    ]
      ? $$props['class']
      : ''}"
  >
    <div
      on:click={userInfo}
      on:keyup={() => console.log("keyup")}
      class="w-16 mr-2"
    >
      <img
        class="w-14 h-14 rounded-full"
        src={user && user.picture ? user.picture : "profile-placeholder.png"}
        alt={note.pubkey.slice(0, 5)}
        crossorigin="anonymous" 
        title="ID: {note.id} .. Pubkey: {note.pubkey} .. Content: {note.content} .. Tree: {note.tree} .. Tags: {JSON.stringify(note.tags)} ... Replies: {note.replies.length} ... User: {JSON.stringify(note.user)}"
      />
    </div>

    <div class="flex-col w-full">
      <div class="px-2">
        <div class="h-12">
          <div class="flex gap-2 h-12 w-full ">
            <div class="text-left order-first w-6/12">
              <strong class="text-black text-sm font-medium">
                <span title={note.pubkey}>{normalizeName(user)}</span>
                {#if followed}
                  <i class="fa-solid fa-bookmark" />
                {/if}
                <small class="text-gray">{getTime(note.created_at)}</small>
              </strong>
            </div>

            <div class="text-right order-last md:w-6/12">
              <span class="text-right">
                {#if userHasAccount}
                  <div class="relative">
                    <button class="dropdown-toggle" on:click={toggleMenu}>
                      <i class="fa-solid fa-ellipsis" />
                    </button>
                    {#if expanded}
                      <div role="menu" tabindex="-1" class="dropdown-menu">
                        <ul class="py-2 w-44 text-left">
                          <li>
                            <button
                              class="downdown-menu-button"
                              on:click={banUser}
                            >
                              <i class="fa-solid fa-ban" /> Block user
                            </button>
                          </li>
                          <li>
                            <button
                              class="downdown-menu-button"
                              on:click={removeNote}
                            >
                              <i class="fa-solid fa-comment-slash" /> Mute post
                            </button>
                          </li>
                        </ul>
                      </div>
                    {/if}
                  </div>
                {/if}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="xl:max-w-lg md:max-w-lg sm:max-w-sm">
        <div class="text-left w-full max-w-max break-words items-top">
          <span class="text-black text-md font-medium">
            {@html toHtml(note.content)}
            {#if link}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="mt-2" on:click={(e) => e.stopPropagation()}>
                <Preview
                  endpoint={`${import.meta.env.VITE_PREVIEW_LINK}/preview/link`}
                  url={link}
                />
              </div>
            {/if}
          </span>
        </div>
      </div>

      <div class="w-full">
        {#if userHasAccount}
          <p class="mt-4 flex space-x-8 w-full p-1">
            <span class={votedFor == "+" ? "text-blue-700" : ""}>
              <button type="button" on:click={upvoteHandler}>
                <i class="fa-solid fa-thumbs-up " />
              </button>
              {upvotes}
            </span>
            <span class={votedFor == "-" ? "text-blue-700" : ""}>
              <button type="button" on:click={downvoteHandler}>
                <i class="fa-solid fa-thumbs-down" />
              </button>
              {downvotes}
            </span>

            <span>
              <button type="button" on:click={createTextNote}>
                <i class="fa-regular fa-comment-dots" />
              </button>
              {#if note.replies}
                {note.replies.length}
              {/if}
            </span>
            <span>
              {#if note.replies && note.replies.length > 0}
                <button type="button" on:click={toggleReplies} class="">
                  {#if repliesExpanded}
                    Hide {note.replies.length} repl{#if note.replies.length == 1}y{:else}ies{/if}
                  {:else}
                    Show {note.replies.length} repl{#if note.replies.length == 1}y{:else}ies{/if}
                  {/if}
                </button>
              {/if}
            </span>
          </p>
        {/if}

        {#if repliesExpanded}
            {#if note.replies && note.replies.length > 0}
              <ul>
              {#each note.replies ? note.replies : [] as textnote (textnote.id)}
                <li>
                  <svelte:self note={textnote} {userHasAccount} />
                </li>
                {/each}  
              </ul>
            {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .border-indigo-100 {
    border-color: rgb(224 231 255);
  }
  .border-indigo-200 {
    border-color: rgb(199 210 254);
  }
  .border-indigo-300 {
    border-color: rgb(165 180 252);
  }
  .border-indigo-400 {
    border-color: rgb(129 140 248);
  }
  .border-indigo-500 {
    border-color: rgb(99 102 241);
  }
  .border-indigo-600 {
    border-color: rgb(79 70 229);
  }
  .border-indigo-700 {
    border-color: rgb(67 56 202);
  }
  .border-indigo-800 {
    border-color: rgb(55 48 163);
  }
  .border-indigo-900 {
    border-color: rgb(49 46 129);
  }
</style>
