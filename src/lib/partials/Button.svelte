<script lang="ts">
    enum buttonTypes {button = 'button', submit = 'submit', reset = 'reset'}
    
    //export let class:string = '' 
    export let type:string = buttonTypes.button
    export let click:any = ()=>{ console.log('Clicked me')}
    let classNames:string = "px-6 py-2.5 bg-blue-600 text-white font-medium text-xs " +
          "leading-tight uppercase rounded shadow-md hover:bg-blue-700 " +
          "hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none " +
          "focus:ring-0 active:bg-blue-800 active:shadow-lg transition " +
          "duration-150 ease-in-out"
</script>

{#if type == buttonTypes.button}
<button
    type='button'     
    on:click={click} 
    class="{classNames} {$$props['class'] ? $$props['class'] : ''}"
>
    <slot></slot>
</button>
{/if}

{#if type == buttonTypes.reset}
<button
    type='reset'     
    on:click={click} 
    class="{classNames} {$$props['class'] ? $$props['class'] : ''}"
>
    <slot></slot>
</button>
{/if}

{#if type == buttonTypes.submit}
<button
    type='submit'     
    class="{classNames} {$$props['class'] ? $$props['class'] : ''}"
>
    <slot></slot>
</button>
{/if}
