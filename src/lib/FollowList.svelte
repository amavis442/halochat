<script lang="ts">
  import { getContactlist } from "./state/app";
  import type { TextNote, Account, User } from "./state/types";
  import { pluck, uniq } from "ramda";
  import { onMount } from "svelte";
  import { now } from "./util/time";
  import { account } from "./stores/account";

  onMount(async () => {});
</script>
