<script lang="ts">
  import { Router, Link, Route } from 'svelte-routing'
  import Home from './routes/Home.svelte'
  import Relays from './routes/Relays.svelte'
  import Account from './routes/Account.svelte'
  import '@fortawesome/fontawesome-free/css/fontawesome.css'
  import '@fortawesome/fontawesome-free/css/solid.css'
  export let url = ''
</script>

<Router {url}>
  <div
    class="grid grid-cols-20/40/20 w-screen h-screen max-w-screen max-h-screen
    overflow-x-hidden overflow-y-hidden">
    <header>
      <div
        class="mt-6 grid-cols-1 justify-start items-center pl-4 w-full
        border-gray-600 border-b space-y-3 pb-5">
        <nav>
          <p class="text-base leading-4">
            <Link to="/">Home</Link>
          </p>
          <p class="text-base leading-4">
            <Link to="relays">Relays</Link>
          </p>
          <p class="text-base leading-4">
            <Link to="account">Account</Link>
          </p>
        </nav>
      </div>
    </header>
    <main class="grid-cols-2 text-center justify-items-center max-h-max">
      <div>
        <Route path="/">
          <Home />
        </Route>
        <Route path="relays">
          <Relays />
        </Route>
        <Route path="account">
          <Account />
        </Route>
      </div>
    </main>
    <div class="grid-cols-3 max-h-max"></div>
  </div>
</Router>
