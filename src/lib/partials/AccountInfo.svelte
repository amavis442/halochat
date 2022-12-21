<script lang="ts">
  import { account } from "../stores/account";
  import Anchor from "./Anchor.svelte";
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
