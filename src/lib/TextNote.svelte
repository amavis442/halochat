<script lang="ts">
  import { getTime } from "./util/time";
  import type { User, TextNote as Note } from "./state/types";
  import { toHtml, findLink } from "./util/html";
  import { beforeUpdate, onMount } from "svelte";
  import { publishReaction } from "./state/pool";
  import TextArea from "./partials/TextArea.svelte";
  import Button from "./partials/Button.svelte";
  import { publishReply } from "./state/pool";
  import { account } from "./stores/account";
  import { pluck, uniqBy, prop } from "ramda";
  import { blocklist } from "./stores/block";
  import { now } from "./util/time";
  import { addToast } from "./stores/toast";
  import { users } from "./stores/users";
  import { feed } from "./state/app";
  import { deleteNodeFromTree, log } from "./util/misc";
  import Preview from "./partials/Preview.svelte";
  import { getRootTag } from "./util/tags";
  import Modal from "./partials/Modal.svelte";
  import Spinner from "./Spinner.svelte";

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
        let voted = note.reactions.find((r) => r.pubkey == $account.pubkey);
        votedFor = voted.content;
      }
    }
  });

  function isFollowed(): boolean {
    if (contacts.getList().find((c) => c[1] == note.pubkey)) {
      return true;
    }
    return false;
  }

  let followed = false;
  $: followed = isFollowed()

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

  let promiseReply: Promise<void>;
  async function onSubmit(e: Event) {
    const target = e.target as HTMLFormElement;
    const formData = new FormData(target);

    const data: { replyText?: string } = {};
    //@ts-ignore
    for (let field of formData) {
      const [key, value] = field;
      data[key] = value;
    }
    let v = Object.values(data);
    console.debug(v);

    promiseReply = publishReply(v[0], note).then(() => {
      showElement = false;
    });
  }

  let showElement: boolean = false;

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
    followed = true
  }

  function unfollowUser() {
    expanded = false;

    let c = contacts.unFollow(note.pubkey);
    console.log(c);
    contacts.publishList(c);
    followed = false
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

  export let expanded: boolean = false;
  function toggleMenu() {
    expanded = !expanded;
  }

  let showInfoModal: boolean = false;
</script>

<Modal isOpen={showInfoModal}>
  <slot>
    <div class="flex justify-left">
      <img
        class="w-16 h-16 rounded-full"
        src={user && user.picture ? user.picture : "profile-placeholder.png"}
        alt={note.pubkey.slice(0, 5)}
      />
      <div class="p-6">
        <h5 class="text-gray-900 text-xl font-medium mb-2">
          {user.name}
        </h5>
        <p class="text-gray-700 text-base mb-4">
          {user.about}
        </p>
      </div>
    </div>
    <div class="flex space-x-1 p-2 justify-end">
      {#if !followed}
        <Button click={followUser}>Follow</Button>
      {:else}
        <Button click={unfollowUser}>unFollow</Button>
      {/if}
      <Button type="button" click={() => (showInfoModal = !showInfoModal)}>
        Close
      </Button>
    </div>
  </slot>
</Modal>

<Modal isOpen={showElement}>
  <slot>
    <form on:submit|preventDefault={onSubmit}>
      <h5 class="text-gray-900 text-xl font-medium mb-2">
        Re: {note.content.slice(0, 30)}
      </h5>
      <TextArea id="reply{note.id}" placeholder="Add reply" cols="20" />

      <div class="flex space-x-1 p-2 justify-end">
        <Button type="submit" class="space-x-1"
          ><i class="fa-solid fa-paper-plane" /> <span>Send</span></Button
        >
        <Button
          type="button"
          click={() => (showElement = !showElement)}
          class="space-x-1"
        >
          <i class="fa-solid fa-circle-xmark" /> <span>Close</span>
        </Button>
      </div>
    </form>
  </slot>
</Modal>

{#await promiseReply}
  <Spinner />
{/await}
{#if note && note.kind == 1}
  <div class="flex items-top gap-4 p-4 w-full overflow-auto bg-blue-200">
    <div
      on:click={() => (showInfoModal = !showInfoModal)}
      on:keyup={() => (showInfoModal = !showInfoModal)}
    >
      <img
        class="w-12 h-12 rounded-full"
        src={user && user.picture ? user.picture : "profile-placeholder.png"}
        alt={note.pubkey.slice(0, 5)}
        title={JSON.stringify(note)}
      />
    </div>
    <div class="flex flex-col w-11/12">
      <div class="flex items-start">
        <div class="flex-start text-left w-6/12">
          <strong
            class="text-slate-900 text-sm font-medium dark:text-slate-200"
          >
            {normalizeName(user)}
            <small class="text-gray">{getTime(note.created_at)}</small>
          </strong>
        </div>
        <div class="flex-end text-right  w-6/12">
          <span class="text-right">
            {#if userHasAccount}
              <div class="relative">
                <button class="dropdown-toggle" on:click={toggleMenu}>
                  <i class="fa-solid fa-ellipsis" />
                </button>
                {#if expanded}
                  <div role="menu" tabindex="-1" class="dropdown-menu">
                    <ul class="py-1 w-44 text-left">
                      <li>
                        <button class="downdown-menu-button" on:click={banUser}>
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
      <div class="text-left">
        <span class="text-slate-500 text-sm font-medium dark:text-slate-400">
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
      {#if userHasAccount}
        <p class="mt-4 flex space-x-4 w-max p-1">
          <span class={votedFor == "-" ? "text-blue-700" : ""}>
            <button type="button" on:click={downvoteHandler}>
              <i class="fa-solid fa-thumbs-down" />
            </button>
            {note?.downvotes ? note.downvotes : 0}
          </span>
          <span class={votedFor == "+" ? "text-blue-700" : ""}>
            <button type="button" on:click={upvoteHandler}>
              <i class="fa-solid fa-thumbs-up " />
            </button>
            {note?.upvotes ? note.upvotes : 0}
          </span>

          <span>
            <button type="button" on:click={() => (showElement = !showElement)}>
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
{/if}
