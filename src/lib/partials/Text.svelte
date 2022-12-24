<script lang="ts">
    export let id = Math.random().toString().slice(2)
    export let placeholder:string = 'Placeholder'
    export let describedby:string = ''
    export let value:string
</script>
<input
        type="text"
        class="form-control block w-full px-3 py-1.5 text-base font-normal
        text-gray-700 bg-white bg-clip-padding border border-solid
        border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700
        focus:bg-white focus:border-blue-600 focus:outline-none {$$props['class'] ? $$props['class'] : ''}"
        id='{id}'
        name='{id}'
        bind:value
        aria-describedby="{describedby}"
        placeholder="{placeholder}" />
