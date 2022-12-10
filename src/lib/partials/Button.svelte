<script lang="ts">
    export let type:string = 'button'
    export let click:any = ()=>{ console.log('Clicked me')}
    let classNames:string = "px-6 py-2.5 bg-blue-600 text-white font-medium text-xs " +
          "leading-tight uppercase rounded shadow-md hover:bg-blue-700 " +
          "hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none " +
          "focus:ring-0 active:bg-blue-800 active:shadow-lg transition " +
          "duration-150 ease-in-out"
</script>

{#if type !== 'submit'}
<button
    type={type}     
    on:click={click} 
    class={classNames}
>
    <slot></slot>
</button>
{:else}
<button
    type='submit'     
    class={classNames}
>
    <slot></slot>
</button>
{/if}
