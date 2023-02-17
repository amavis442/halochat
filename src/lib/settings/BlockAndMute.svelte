<script lang="ts">
  import { settings } from "../stores/settings";
  import { addToast } from "../partials/Toast/toast";
  import Button from "../partials/Button.svelte";
  import Text from "../partials/Text.svelte";
  import Link from "../partials/Link.svelte";
  import { writable, type Writable } from 'svelte/store'
  import { getLocalJson, setLocalJson, setting } from '../util/storage'

  let blockLightning: Writable<boolean> = writable(getLocalJson(setting.Settings) || false);
  let blockText = "";
  blockLightning.subscribe(($settings) => {
    console.log($settings)

    setLocalJson(setting.Settings, $settings)
  })


</script>

<div class="xl:w-8/12 lg:w-10/12 md:w-10/12 sm:w-full">
  <div
    class="block p-6 rounded-lg shadow-lg bg-white w-full ml-6 mt-6 bg-blue-200"
  >
    <label>
      <input type="checkbox" bind:checked={$blockLightning} />
      Block lightning invoices (not implemented yet)
    </label>
  </div>
</div>
