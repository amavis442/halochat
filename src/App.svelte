<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Feed from "./routes/Feed.svelte";
  import FollowFeed from "./routes/FollowFeed.svelte";
  import BlockAndMute from "./routes/BlockAndMute.svelte";


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

  export let url = "";
  
  users.set([]); // new Session, means new users, else the browser will complain of storage full
</script>

<Toasts />

<Router url="{url}">
  <div class="flex h-screen w-screen m-auto justify-center">
    <header
      class="mt-6 items-center pl-4 border-gray-600 border-b space-y-3 pb-5 xl:w-2/12 md:w-3/12 sm:w-full"
    >
      <AccountInfo />
      <nav>
        <p class="nav-p {url === '/' ? 'selected' : ''}">
          <Link to="/" title="Global feed" class="flex"
            >
            <div class="justify-end w-full">
            Global
          </div>
          </Link>
        </p>
        <p class="nav-p {url === '/followfeed' ? 'selected' : ''}">
          <Link to="/followfeed" title="Contacts that you follow">
            Following
            </Link>
        </p>
        <p class="nav-p {url === '/posts' ? 'selected' : ''}">
          <Link to="posts" title="Posts you made">Posts</Link>
        </p>
        <p class="nav-p {url === '/' ? 'selected' : ''}">
          <Link to="contacts" title="Admin list of contacts to follow"
            >Contacts</Link
          >
        </p>
        <p class="nav-p {url === '/relays' ? 'selected' : ''}">
          <Link to="relays" title="Relays to use">Relays</Link>
        </p>
        <p class="nav-p {url === '/account' ? 'selected' : ''}">
          <Link to="account" title="Your account data">Account</Link>
        </p>
        <p class="nav-p {url === '/blockandmute' ? 'selected' : ''}">
          <Link to="blockandmute" title="Block and mute settings">Block and mute</Link>
        </p>
      </nav>
    </header>

    <main class="xl:w-6/12 md:w-9/12 sm:w-full overflow-y-auto">
      <Route path="/" component="{Feed}" />
      <Route path="/global" component="{Feed}" />
      <Route path="/followfeed" component="{FollowFeed}" />
      <Route path="/posts" component="{Posts}" />
      <Route path="relays" component="{Relays}" />
      <Route path="contacts" component="{Contacts}" />
      <Route path="account" component="{Account}" />
      <Route path="blockandmute" component="{BlockAndMute}" />
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

  .selected {
    text-decoration-line: underline;
  }

</style>
