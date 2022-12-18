<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Home from "./routes/Home.svelte";
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
          <p
            class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
            leading-tight uppercase rounded shadow-md hover:bg-blue-700
            hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
            focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
            ease-in-out mb-4"
          >
            <Link to="/">Home</Link>
          </p>
          <p
            class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
            leading-tight uppercase rounded shadow-md hover:bg-blue-700
            hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
            focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
            ease-in-out mb-4"
          >
            <Link to="relays">Relays</Link>
          </p>
          <p
            class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
            leading-tight uppercase rounded shadow-md hover:bg-blue-700
            hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
            focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
            ease-in-out mb-4"
          >
            <Link to="account">Account</Link>
          </p>
        </nav>
        <p>
          {#if $account}
            <div class="flex items-top justify-center ">
              <div
                class="w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl from-blue-100 via-blue-300 to-blue-500 bg-gradient-to-br p-2"
              >
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
                    /></span
                  >
                </div>
                <p class="text-center">
                  <span class="font-bold">{$account.name}</span>
                </p>
                <p class="text-xs text-center mb-5">
                  Pubkey: {$account.pubkey.slice(
                    0,
                    4
                  )}...{$account.pubkey.slice(-4)}
                </p>
                <p class="text-xs text-center mb-5">
                  About: {$account.about}
                </p>
              </div>
            </div>
          {:else}
            Not logged in. Use account to create account
          {/if}
        </p>
      </div>
    </header>
    <main class="grid-cols-2 text-center justify-items-center max-h-max">
      <Route path="/">
        <Home />
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
