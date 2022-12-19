<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Feed from "./routes/Feed.svelte";
  import Relays from "./routes/Relays.svelte";
  import Account from "./routes/Account.svelte";
  import "@fortawesome/fontawesome-free/css/fontawesome.css";
  import "@fortawesome/fontawesome-free/css/solid.css";
  import { account } from "./lib/stores/account";
  import Anchor from "./lib/partials/Anchor.svelte";

  export let url = "";
</script>

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
        <nav>
          <p class="nav-p">
            <Link to="/">Feed</Link>
          </p>
          <p class="nav-p">
            <Link to="/followed">Followed</Link>
          </p>
          
          <p class="nav-p">
            <Link to="relays">Relays</Link>
          </p>
          <p class="nav-p">
            <Link to="account">Account</Link>
          </p>
        </nav>

        <div class="flex items-top justify-center ">
          <div
            class="w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl from-blue-100 via-blue-300 to-blue-500 bg-gradient-to-br p-2"
          >
            {#if $account.pubkey}
              <div class="text-center">
                <span
                  class="border-4 border-white rounded-full mx-auto inline-block"
                >
                  <img
                    src={$account.picture
                      ? $account.picture
                      : "profile-placeholder.png"}
                    class="w-12 h-12 rounded-full"
                    alt={$account.name.slice(0, 10)}
                  />
                </span>
              </div>

              <p class="text-center">
                <span class="font-bold">{$account.name}</span>
              </p>

              <p class="text-xs text-center mb-5">
                Pubkey: {$account.pubkey.slice(0, 4)}...{$account.pubkey.slice(
                  -4
                )}
              </p>

              <p class="text-xs text-center mb-5">
                About: {$account.about}
              </p>
            {:else}
              <span>Not logged in. Use <Anchor href="account">account</Anchor> to create account</span>
            {/if}
          </div>
        </div>
      </div>
    </header>

    <main class="grid-cols-2 text-center justify-items-center max-h-max">
      <Route path="/">
        <Feed isFollowedView={false}/>
      </Route>
      <Route path="/followed">
        <Feed isFollowedView={true}/>
      </Route>
      <Route path="relays">
        <Relays />
      </Route>
      <Route path="account">
        <Account />
      </Route>
    </main>

    <div class="grid-cols-3 max-h-max" />
  </div>
</Router>
