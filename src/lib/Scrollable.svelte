<script lang="ts">
  import { delay } from './util/time'
  import { throttle, debounce } from 'throttle-debounce'
  import Spinner from './Spinner.svelte'
  import { onMount } from 'svelte'

  export let loading: boolean = false
  export let cbGetData: Function
  export let rootElement: string
  export let currentPage: number = 1

  const throttleFunc = debounce(
    1000,
    async () => {
      if (loading) {
        return
      }
      loading = true
      console.log('Getting data')
      await cbGetData()
      await delay(300)
      loading = false
    },
    { noLeading: false, noTrailing: false },
  )

  onMount(async () => {
    let control = document.getElementById(rootElement)
    control.addEventListener(
      'scroll',
      (event) => {
        const { scrollTop, scrollHeight, clientHeight } = control
        if (scrollTop + clientHeight >= scrollHeight - 5) {
          throttleFunc()
        }
      },
      {
        passive: true,
      },
    )
  })
</script>

{#if loading}
  <Spinner />
{/if}
