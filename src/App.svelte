<script lang="ts">
    import { Router, Link, Route } from "svelte-routing";
    import Home from "./routes/Home.svelte";
    import Relays from "./routes/Relays.svelte";
    import "@fortawesome/fontawesome-free/css/fontawesome.css";
    import "@fortawesome/fontawesome-free/css/solid.css";
    export let url = "";
</script>

<Router {url}>
    <nav>
        <Link to="/">Home</Link>
        <Link to="relays">Relays</Link>
    </nav>
    <div>
        <Route path="/"><Home /></Route>
        <Route path="relays"><Relays /></Route>
    </div>
</Router>
