<script lang="ts">
  import { delay } from '../util/time'
  import { throttle } from 'throttle-debounce'
  import Spinner from './Spinner.svelte'
  import { onMount } from 'svelte'

  export let loading: boolean = false
  export let cbGetData: Function
  export let rootElement: string
  export let observeElement:string

  async function handleIntersection(changes, observer) {
    changes.forEach((change) => {
      if (change.intersectionRatio > 0) {
 
        const throttleFunc = throttle(
          1000,
          async () => {
            console.log('Getting data')
            await cbGetData()
            await delay(300)
            loading = false
          },
          { noLeading: false, noTrailing: false },
        )
        throttleFunc()
      }
    })
  }

  onMount(async () => {
    let options = {
      root: document.getElementById(rootElement),
      rootMargin: '0px',
      threshold: 1.0,
    }
    let observer = new IntersectionObserver(handleIntersection, options)

    observer.observe(document.querySelector(observeElement))
  })
</script>

{#if loading}
  <Spinner />
{/if}
