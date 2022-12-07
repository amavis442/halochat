<script lang="ts">
  import { getTime } from '../util/time'

  export let note = {}

  let name: string = note.user
    ? note.user.name
      ? note.user.name
      : note.pubkey
    : note.pubkey
</script>

<div class="block justify-center mb-4 w-500">
  <div class="p-6 rounded-lg shadow-lg bg-white max-w-2xl mx-auto flex ">

    <img
      src={note.user && note.user.picture ? note.user.picture : 'profile-placeholder.png'}
      class="object-cover h-12 w-12 rounded-full"
      alt={note.user ? note.user.about : note.pubkey}
      title={note.user ? note.user.name : note.pubkey} />
    <div class="pr-2 text-left px-2">
      <span class="text-black font-bold">{name.slice(0, 10)}</span>
      <small class="text-gray">{getTime(note.created_at)}</small>
      <p class="text-black">
        <span class="pr-4">{note.content}</span>
      </p>

    </div>
  </div>
</div>
