<script lang="ts">
  import { onMount } from "svelte";
  import Link from "./Link.svelte";
  import {log} from '../util/misc';
  
  export let url: string = "";
  export let endpoint: string;
  let preview;

  onMount(async () => {
    log("Getting preview data");

    const json = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ url: url }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        log("Reponse from preview app.");
        return res.json();
      })
      .then((data) => {
        log("Json is ", data);
        return data;
      })
      .catch((err) => {
        console.error(err);
      });

    if (json && json.title) {
      preview = json;
    }
  });
</script>

{#if preview}
  <div class="max-w-sm">
    <div
      class="rounded border border-solid border-medium flex flex-col bg-white overflow-hidden"
    >
      <Link href={url}>
        {#if preview.images}
          <img src={preview.images[0]} alt={preview.description}/>
          <div class="h-px bg-medium" />
        {/if}
        <div class="px-4 py-2 text-black flex flex-col bg-white">
          <strong class="whitespace-nowrap text-ellipsis overflow-hidden"
            >{preview.title}</strong
          >
          <small>{preview.description}</small>
        </div>
      </Link>
    </div>
  </div>
{/if}
