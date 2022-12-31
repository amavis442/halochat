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
  import { feed } from "./state/app";
  import { deleteNodeFromTree } from "./util/misc";
  import Preview from "./partials/Preview/Preview.svelte";
  import { getRootTag } from "./util/tags";

  import { openModal } from "svelte-modals";
  import UserModal from "./partials/Modal/UserModal.svelte";
  import CreateNoteModal from "./partials/Modal/CreateNoteModal.svelte";

  import Spinner from "./partials/Spinner/Spinner.svelte";
  import contacts from "./state/contacts";

  export let note: Note | any; // Todo: Do not know how to type this correctly to make sure in Notes it does not say Note__SvelteComponent_ <> Note type, very annoying
  export let userHasAccount: boolean = false;

  let user: User;
  let votedFor: string = "";
  let link: string | null = null;

  beforeUpdate(() => {
    if (note.reactions && $account) {
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
    await publishReaction("+", note);
  }

  async function downvoteHandler() {
    await publishReaction("-", note);
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

    feed.update((data) => data.filter((n: Note) => n.pubkey != note.pubkey));

    addToast({
      message: "User " + note.pubkey.slice(0, 10) + " blocked!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  function isFollowed(): boolean {
    if (contacts.getList().find((c) => c[1] == note.pubkey)) {
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
    contacts.saveContactList();
    followed = true;
  }

  function unfollowUser() {
    expanded = false;

    let c = contacts.unFollow(note.pubkey);
    console.log(c);
    contacts.publishList(c);
    followed = false;
  }

  function removeNote() {
    expanded = false;
    let rootTag = getRootTag(note.tags);
    let parentNote = null;

    if (rootTag.length) {
      parentNote = $feed.find((n: Note) => n.id == rootTag[1]);
    }

    if (!parentNote) {
      $feed = $feed.filter((n: Note) => n.id != note.id);
    } else {
      deleteNodeFromTree(parentNote, note.id);
      $feed = $feed; //trigger update
    }

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

</script>

{#await promiseReply}
  <Spinner />
{/await}

{#if note && note.kind == 1}
  <div
    id={note.id}
    class="flex flex-row w-full min-h-full items-top gap-2 mb-2 overflow-y-auto bg-white rounded-lg p-1 border-l-8 {borderColor}"
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
        title={JSON.stringify(note)}
      />
    </div>

    <div class="flex-col w-full">
      <div class="px-2">
        <div class="h-12">
          <div class="flex gap-2 h-12 w-full ">
            <div class="text-left order-first w-6/12">
              <strong class="text-black text-sm font-medium">
                {#if followed}
                  <i class="fa-solid fa-bookmark" />
                {/if}
                <span title="{note.pubkey}">{normalizeName(user)}</span>
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
              {note?.upvotes ? note.upvotes : 0}
            </span>
            <span class={votedFor == "-" ? "text-blue-700" : ""}>
              <button type="button" on:click={downvoteHandler}>
                <i class="fa-solid fa-thumbs-down" />
              </button>
              {note?.downvotes ? note.downvotes : 0}
            </span>


            <span>
              <button type="button" on:click={createTextNote}>
                <i class="fa-regular fa-comment-dots" />
              </button>
              {#if note.replies}
                {note.replies.length}
              {/if}
            </span>
          </p>
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
