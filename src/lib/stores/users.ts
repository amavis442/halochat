import { writable } from 'svelte/store'
import type { User, Event } from '../state/types'
import { setLocalJson, getLocalJson } from '../util/storage'
import { now } from '../util/time';

export const users = writable(getLocalJson('halonostr/users') || []);

export function addUser(user: User) {
  users.update(data => {
    let foundUser = data.find((item: User) => user.pubkey == item.pubkey)
    if (foundUser) {
      if (foundUser.refreshed < now() - 60 * 10) {
        foundUser = {
          ...foundUser,
          user
        }
        console.log('Updated user ', foundUser)
      }
      return data
    }

    data.push(user)
    return data
  })
}

export function removeUser(pubkey: string) {
  users.update(data => {
    return data.filter((value: User) => {
      return value.pubkey != pubkey
    })
  });
}

export function formatUser(evt: Event, relay: string) {
  const content = JSON.parse(evt.content);
  const regex = new RegExp('(http(s?):)|([/|.|\w|\s])*\.(?:jpg|gif|png)');
  if (!regex.test(content.picture)) {
      content.picture = 'profile-placeholder.png'
  }

  let user: User = {
      pubkey: evt.pubkey,
      name: content.name,
      about: content.about,
      picture: content.picture,
      content: JSON.stringify(content),
      refreshed: now(),
      relays: [relay]
  }

  return user
}

users.subscribe((value) => {
  setLocalJson('halonostr/users', value)
})
