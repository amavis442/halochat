<script lang="ts">
  import { delay } from "./util/time";
  import { debounce } from "throttle-debounce";
  import Spinner from "./Spinner.svelte";
  import { onMount } from "svelte";
  import { log } from "./util/misc";

  export let loading: boolean = false;
  export let cbGetData: Function;
  export let rootElement: string;

  /**
   * @see https://github.com/niksy/throttle-debounce
   */
  const throttleFunc = debounce(1000, async () => {
    if (loading) {
      return;
    }
    loading = true;
    log("Getting data");
    await cbGetData();
    await delay(300);
    loading = false;
  });

  onMount(async () => {
    let control = document.getElementById(rootElement);
    control.addEventListener(
      "scroll",
      () => {
        const { scrollTop, scrollHeight, clientHeight } = control;
        if (scrollTop + clientHeight >= scrollHeight - 5) {
          throttleFunc();
        }
      },
      {
        passive: true,
      }
    );
  });
</script>

{#if loading}
  <Spinner />
{/if}
