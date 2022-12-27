<script lang="ts">
  import { onMount } from "svelte";
  import Link from "../Link.svelte";
  import { log } from "../../util/misc";

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
        log("error", err);
      });

    if (json) {
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
          <img src={preview.images[0]} alt={preview.description} />
          <div class="h-px bg-medium" />
        {/if}
        {#if preview.mediaType == "image"}
          <img src={preview.url} alt={preview.url} />
          <div class="h-px bg-medium" />
        {/if}

        {#if preview.title}
          <div class="px-4 py-2 text-black flex flex-col bg-white">
            <strong class="whitespace-nowrap text-ellipsis overflow-hidden"
              >{preview.title}</strong
            >
            {#if preview.description}
              <small>{preview.description}</small>
            {/if}
          </div>
        {/if}
      </Link>
    </div>
  </div>
{/if}
