<script lang="ts">
  import { relays } from "../state/pool";
  import Spinner from "./Spinner/Spinner.svelte";
  import Button from "./Button.svelte";
  import Text from "./Text.svelte";
  import Anchor from "./Anchor.svelte";
  
  export let msg:string;
  export let sendMessage:Function 
  export let scrollHandler:any

  export let moreLoading = Promise<void>;
  
</script>

<div class="flex flex-col gap-4 h-screen" >
  <div class="h-screen" >
    <div
      id="Notes"
      class="flex flex-col relative mx-auto bg-gray-800
            dark:highlight-white/5 shadow-lg ring-1 ring-black/5
            divide-y ml-4 mr-4
            space-y-0 place-content-start
            h-full max-h-full w-11/12"
      
    >
      {#if $relays && $relays.length}
        <div class="h-full w-full overflow-y-auto" on:scroll={scrollHandler}>
          <slot/>
        </div>
        {#await moreLoading}
          <Spinner size={36} />
        {/await}
        <div class="flex h-24 w-full items-center from-blue-100 via-blue-300 to-blue-500 bg-gradient-to-br">
          <div class="flex w-full items-content justify-center">
            <div class="w-4/5 mr-2">
              <Text bind:value={msg} id="msg" placeholder="Message to send" />
            </div>
            <Button type="button" click={sendMessage}>Send</Button>
          </div>
        </div>
      {:else}
        <div class="flex h-full place-items-center">
          <div class="w-full h-24 rounded-lg p-4 text-center  bg-blue-200 mb-2">
            <h2>
              Please add a relay first. You can do this here
              <Anchor href="relays">relays</Anchor>
            </h2>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
