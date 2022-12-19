<script lang="ts">
  import { getTime } from "./util/time";
  import type { User, Note } from "./state/types";
  import { toHtml } from "./util/html";
  import { beforeUpdate, onMount } from "svelte";
  import { publishReaction } from "./state/pool";
  import TextArea from "./partials/TextArea.svelte";
  import Button from "./partials/Button.svelte";
  import { fade } from "svelte/transition";
  import { publishReply } from "./state/pool";
  import { account } from "./stores/account";
  import { pluck, uniqBy, prop } from "ramda";
  import { blocklist, followlist } from "./state/app";
  import { now } from "./util/time";
  import { addToast } from "./stores/toast";
  import { users } from "./stores/users";
  import { notes } from "./stores/notes";

  export let note: Note|any; // Todo: Do not know how to type this correctly to make sure in Notes it does not say Note__SvelteComponent_ <> Note type, very annoying
  export let userHasAccount: boolean = false;

  let user: User;
  let votedFor: string = "";
  let followed: boolean = false;

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

  onMount(async () => {
    user = note?.user;
    if (Object.values($followlist).find((u: User) => u.pubkey == note.pubkey)) {
      followed = true;
    }
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

  function showInfo() {
    console.info("Debug note info from mouseover: ", note);
  }

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
    publishReply(v[0], note);
    showElement = false;
  }
  let showElement: boolean = false;

  function banUser() {
    expanded = false;
    $blocklist.push({ pubkey: note.pubkey, added: now() });
    $blocklist = uniqBy(prop("pubkey"), $blocklist);

    let user: User = $users.find((u) => (u.pubkey = note.pubkey));
    user.name = user.name + "[BLOCKED]";
    users.update((data) => data); // Hopes this triggers the view
    notes.update((data) => data.filter((n: Note) => n.pubkey != note.pubkey));

    addToast({
      message: "User " + note.pubkey.slice(0, 10) + " blocked!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  function followUser() {
    expanded = false;
    $followlist.push({ pubkey: note.pubkey, added: now() });
    $followlist = uniqBy(prop("pubkey"), $followlist);
    addToast({
      message: "User " + note.pubkey.slice(0, 10) + " followed!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }
  function unfollowUser() {
    expanded = false;
    followed = true;

    followlist.update((data) => {
      data.filter(
        (d: { pubkey: string; added: number }) => d.pubkey != note.pubkey
      );
    });

    addToast({
      message: "User " + note.pubkey.slice(0, 10) + " unfollowed!",
      type: "success",
      dismissible: true,
      timeout: 3000,
    });
  }

  function removeNote() {
    expanded = false;
    notes.update((data) => data.filter((n: Note) => n.id != note.id));
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
</script>

{#if note && note.kind == 1}
  <div class="flex items-top gap-4 p-4 w-full overflow-auto bg-blue-200">
    <img
      class="w-12 h-12 rounded-full"
      src={user && user.picture ? user.picture : "profile-placeholder.png"}
      alt={note.pubkey.slice(0, 5)}
      title={JSON.stringify(note)}
      on:mouseover={showInfo}
      on:focus={showInfo}
    />
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
                          Block user
                        </button>
                      </li>
                      <li>
                        {#if !followed}
                          <button
                            class="downdown-menu-button"
                            on:click={followUser}
                          >
                            Follow user
                          </button>
                        {:else}
                          <button
                            class="downdown-menu-button"
                            on:click={unfollowUser}
                          >
                            Unfollow user
                          </button>
                        {/if}
                      </li>
                      <li>
                        <button
                          class="downdown-menu-button"
                          on:click={removeNote}
                        >
                          Mute post
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
  {#if showElement}
    <div
      transition:fade={{ delay: 250, duration: 300 }}
      class="gap-4 p-4 ml-16 w-6/12"
    >
      <form on:submit|preventDefault={onSubmit}>
        <TextArea id="reply{note.id}" placeholder="Add reply" cols="20" />
        <div class="actions pt-2">
          <Button type="button" click={() => (showElement = !showElement)}
            >Cancel</Button
          > |
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  {/if}
{/if}
