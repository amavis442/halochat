<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Feed from "./routes/Feed.svelte";
  import Following from "./routes/Following.svelte";

  import Relays from "./routes/Relays.svelte";
  import Account from "./routes/Account.svelte";
  import Follow from "./routes/Follow.svelte";
  import "@fortawesome/fontawesome-free/css/fontawesome.css";
  import "@fortawesome/fontawesome-free/css/solid.css";
  import AccountInfo from "./lib/partials/AccountInfo.svelte";
  import Toasts from "./lib/Toasts.svelte";

  export let url = "";

</script>

<Toasts />

<Router {url}>
  <div
    class="flex h-screen w-screen m-auto"
  >
    <header class="mt-6 items-center pl-4 border-gray-600 border-b space-y-3 pb-5 sm:w-full md:w-3/12 xl:w-6/10">
        <AccountInfo />
        <nav>
          <p class="nav-p">
            <Link to="/">Feed</Link>
          </p>
          <p class="nav-p">
            <Link to="/following">Following</Link>
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
    </header>

    <main class="max-h-max w-full overflow-y-auto">
      <Route path="/">
        <Feed />
      </Route>
      <Route path="/following">
        <Following />
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
  </div>
</Router>
