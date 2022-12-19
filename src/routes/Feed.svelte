<script lang="ts">
    export let isFollowedView:boolean = false;
    import Notes from '../lib/Notes.svelte'
</script>

<Notes isFollowedView={isFollowedView} />
