<script lang="ts">
  import TailwindCss from './TailwindCSS.svelte';
  import { relays, addRelay, removeRelay } from './stores/relays' 
  import { users, removeUser, type User, addUser } from './stores/user'


  addRelay('wss://relay.damus.io')
  addRelay('wss://nostr-relay.wlvs.space')
  removeRelay('wss://relay.damus.io')
  removeRelay('wss://nostr-relay.wlvs.space')
  addRelay('wss://relay.damus.io')
  addRelay('wss://nostr-relay.wlvs.space')
  addRelay('wss://nostr-relay.wlvs.space')
  addRelay('wss://nostr-relay.wlvs.space')
  addRelay('wss://nostr-relay.wlvs.space')


  let user:User = {
    pubkey: '1',
    name: 'Patrick',
    about: 'El Hefe',
    picture: ''
  }
  addUser(user)
  user.pubkey = '2'
  user.name = 'Vincencio'
  user.about = 'Also El Hefe'
  addUser(user)
    
  console.log(JSON.stringify($users))

  //removeUser('1')
  
  console.log(JSON.stringify($users))


  
</script>

<main>
  <p>{ JSON.stringify($relays) }</p>
  <p>{ JSON.stringify($users) }</p>
</main>

<TailwindCss />
