<script lang="ts">
  export let href:string
</script>

<a {href} class="text-blue-600 visited:text-purple-600">
  <slot />
</a>
