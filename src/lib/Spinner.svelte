<script lang="ts">
  import { RingLoader } from 'svelte-loading-spinners'
  export let size:number = 60
</script>

<div class="flex justify-center">
<RingLoader size={size} color="#FF3E00" unit="px" duration="1s" />
</div>
