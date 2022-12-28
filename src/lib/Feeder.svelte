<script lang="ts">
  import { relays } from "./state/pool";
  import { feed } from "./state/app";
  import TextNote from "./TextNote.svelte";
  import TreeNote from "./TreeNote.svelte";

  import Spinner from "./partials/Spinner/Spinner.svelte";
  import Button from "./partials/Button.svelte";
  import Text from "./partials/Text.svelte";
  import Anchor from "./partials/Anchor.svelte";
  
  export let msg:string;
  export let scrollHandler:any
  export let sendMessage:Function 
  
  export let moreLoading = Promise<void>;
  export let userHasAccount: boolean = false;
  
  </script>

<div class="flex flex-col gap-4 h-screen">
  <div class="h-screen">
    <div
      id="Notes"
      class="flex flex-col relative mx-auto bg-gray-800
            dark:highlight-white/5 shadow-lg ring-1 ring-black/5
            divide-y ml-4 mr-4
            space-y-0 place-content-start
            h-full max-h-full w-11/12"
      on:scroll={scrollHandler}
    >
      {#if $relays && $relays.length}
        <div class="h-full w-full overflow-y-auto">
          {#each $feed ? $feed : [] as note (note.id)}
            <ul class="items-center w-full border-hidden">
              <li>
                <div
                  class="flex flex-col items-top p-2 w-full overflow-hidden mb-2"
                >
                  <TextNote {note} {userHasAccount} />
                  {#if note?.replies && note.replies.length > 0}
                    <TreeNote
                      notes={note.replies}
                      {userHasAccount}
                      expanded={false}
                      num={note.replies.length}
                      level={1}
                    />
                  {/if}
                </div>
              </li>
            </ul>
          {/each}
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
