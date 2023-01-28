<script lang="ts">
  import { onMount, beforeUpdate } from "svelte";
  import { account } from "../stores/account";
  import Anchor from "./Anchor.svelte";
  import { log } from "../util/misc";

  let url: string = "";
  let endpoint: string = import.meta.env.VITE_PREVIEW_LINK + "/preview/link";
  let preview: {
    images: any[];
    description: any;
    mediaType: string;
    url: any;
    title: any;
  };

  beforeUpdate(async () => {
    if ($account.picture) {
      url = $account.picture
      console.log(endpoint, url)
      
      const json = await fetch(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ url: url }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
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
      
    }
  });
</script>

<div class="flex items-top justify-center ">
  <div
    class="w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl from-blue-100 via-blue-300 to-blue-500 bg-gradient-to-br p-2"
  >
    {#if $account && $account.pubkey}
      <div class="text-center">
        <span class="border-4 border-white rounded-full mx-auto inline-block">
          <img
            src={$account.picture
              ? $account.picture
              : "profile-placeholder.png"}
            class="w-12 h-12 rounded-full"
            alt={$account.name.slice(0, 10)}
            crossorigin="anonymous"
          />
        </span>
      </div>

      <p class="text-center">
        <span class="font-bold">{$account.name}</span>
      </p>

      <p class="text-xs text-center mb-5">
        Pubkey: {$account.pubkey.slice(0, 4)}...{$account.pubkey.slice(-4)}
      </p>

      <p class="text-xs text-center mb-5">
        About: {$account.about}
      </p>
    {:else}
      <span
        >Not logged in. Use <Anchor href="account">account</Anchor> to create account</span
      >
    {/if}
  </div>
</div>
