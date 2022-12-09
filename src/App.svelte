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
    justify-center bg-gray-100">
    <header>
      <div
        class="mt-6 grid-cols-1 justify-start items-center pl-4 w-full
        border-gray-600 border-b space-y-3 pb-5">
        <nav>
          <p
            class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
            leading-tight uppercase rounded shadow-md hover:bg-blue-700
            hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
            focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
            ease-in-out mb-4">
            <Link to="/">Home</Link>
          </p>
          <p
            class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
            leading-tight uppercase rounded shadow-md hover:bg-blue-700
            hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
            focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
            ease-in-out mb-4">
            <Link to="relays">Relays</Link>
          </p>
          <p
            class="px-6 py-2.5 bg-blue-600 text-white font-medium text-xs
            leading-tight uppercase rounded shadow-md hover:bg-blue-700
            hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none
            focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150
            ease-in-out mb-4">
            <Link to="account">Account</Link>
          </p>
        </nav>
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
