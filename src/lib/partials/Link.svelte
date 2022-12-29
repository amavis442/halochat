<script lang="ts">
  export let href:string
</script>

<a
  href={href}
  class="text-blue-600 visited:text-purple-600 {$$props['class'] ? $$props['class'] : ''}"
  target="_blank"
  rel="noreferrer" >
  <slot />
</a>
