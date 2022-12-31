<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Feed from "./routes/Feed.svelte";
  import FollowFeed from "./routes/FollowFeed.svelte";

  import Relays from "./routes/Relays.svelte";
  import Account from "./routes/Account.svelte";
  import Contacts from "./routes/Contacts.svelte";
  import "@fortawesome/fontawesome-free/css/fontawesome.css";
  import "@fortawesome/fontawesome-free/css/solid.css";
  import AccountInfo from "./lib/partials/AccountInfo.svelte";
  import Toasts from "./lib/partials/Toast/Toasts.svelte";
  import { Modals, closeModal } from "svelte-modals";
  import { users } from "./lib/stores/users";
  import Posts from "./lib/Posts.svelte";
  import { notifications } from "./lib/state/app";

  export let url = "";
  
  users.set([]); // new Session, means new users, else the browser will complain of storage full
</script>

<Toasts />

<Router {url}>
  <div class="flex h-screen w-screen m-auto justify-center">
    <header
      class="mt-6 items-center pl-4 border-gray-600 border-b space-y-3 pb-5 xl:w-2/12 md:w-3/12 sm:w-full"
    >
      <AccountInfo />
      <nav>
        <p class="nav-p">
          <Link to="/" title="Global feed" class="flex"
            >
            <div class="justify-end w-full">
            Global 
          </div>
            {#if $notifications}
            <div class="justify-end">
              <span
                class="inline-block py-1 px-1.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-red-600 text-white rounded ml-2"
                >
                {$notifications}
                </span>
              </div>
            {/if}
          </Link>
        </p>
        <p class="nav-p">
          <Link to="/followfeed" title="Contacts that you follow"
            >Following</Link
          >
        </p>
        <p class="nav-p">
          <Link to="posts" title="Posts you made">Posts</Link>
        </p>
        <p class="nav-p">
          <Link to="contacts" title="Admin list of contacts to follow"
            >Contacts</Link
          >
        </p>
        <p class="nav-p">
          <Link to="relays" title="Relays to use">Relays</Link>
        </p>
        <p class="nav-p">
          <Link to="account" title="Your account data">Account</Link>
        </p>
      </nav>
    </header>

    <main class="xl:w-6/12 md:w-9/12 sm:w-full overflow-y-auto">
      <Route path="/">
        <Feed />
      </Route>
      <Route path="/followfeed">
        <FollowFeed />
      </Route>
      <Route path="/posts">
        <Posts />
      </Route>
      <Route path="relays">
        <Relays />
      </Route>
      <Route path="contacts">
        <Contacts />
      </Route>
      <Route path="account">
        <Account />
      </Route>
    </main>
  </div>
</Router>

<Modals>
  <div
    slot="backdrop"
    class="backdrop"
    on:click={closeModal}
    on:keyup={closeModal}
  />
</Modals>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.5);
  }
</style>
