<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Feed from "./routes/Feed.svelte";
  import Relays from "./routes/Relays.svelte";
  import Account from "./routes/Account.svelte";
  import Follow from "./routes/Follow.svelte";
  import "@fortawesome/fontawesome-free/css/fontawesome.css";
  import "@fortawesome/fontawesome-free/css/solid.css";
  import { account } from "./lib/stores/account";
  import AccountInfo from "./lib/partials/AccountInfo.svelte";

  import Toasts from "./lib/Toasts.svelte";
  import { notes } from "./lib/stores/notes";
  import { users } from "./lib/stores/users";
  import { relays } from "./lib/state/pool";
  import { followlist } from './lib/stores/follow'
  import { blocklist } from './lib/stores/block'

  export let url = "";

  /* big reset for testing and debugging */
  if (import.meta.env.VITE_APP_MODE == "debug") {
    account.set(null);
    notes.set(null);
    relays.set(null);
    users.set(null);
    followlist.set(null);
    blocklist.set(null);
  }
</script>

<Toasts />

<Router {url}>
  <div
    class="grid grid-cols-20/80 w-screen h-screen max-w-screen max-h-screen
    justify-center bg-gray-800"
  >
    <header>
      <div
        class="mt-6 grid-cols-1 justify-start items-center pl-4 w-full
        border-gray-600 border-b space-y-3 pb-5"
      >
        <AccountInfo />
        <nav>
          <p class="nav-p">
            <Link to="/">Feed</Link>
          </p>
          <p class="nav-p">
            <Link to="/followed">Follow</Link>
          </p>

          <p class="nav-p">
            <Link to="relays">Relays</Link>
          </p>
          <p class="nav-p">
            <Link to="follow">Follow list</Link>
          </p>
          <p class="nav-p">
            <Link to="account">Account</Link>
          </p>
        </nav>
      </div>
    </header>

    <main class="grid-cols-2 text-center justify-items-center max-h-max">
      <Route path="/">
        <Feed isFollowedView={false} />
      </Route>
      <Route path="/followed">
        <Feed isFollowedView={true} />
      </Route>
      <Route path="relays">
        <Relays />
      </Route>
      <Route path="follow">
        <Follow />
      </Route>
      <Route path="account">
        <Account />
      </Route>
    </main>

    <div class="grid-cols-3 max-h-max" />
  </div>
</Router>
