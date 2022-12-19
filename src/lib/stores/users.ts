import { writable } from 'svelte/store'
import type { User, Event } from '../state/types'
import { setLocalJson, getLocalJson } from '../util/storage'
import { now } from '../util/time';

export const users = writable(getLocalJson('halonostr/users') || []);

export function annotateUsers(user: User) {
  users.update(data => {
    let foundUser = data.find((item: User) => user.pubkey == item.pubkey)
    if (foundUser) {
      foundUser = {
        ...foundUser,
        user
      }
      console.debug('annotateUsers: ', foundUser)
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
  let user: User = {
    ...JSON.parse(evt.content),
    pubkey: evt.pubkey,
    content: JSON.stringify(evt.content),
    refreshed: now(),
    relays: [relay]
  }
  const regex = new RegExp('(http(s?):)|([/|.|\w|\s])*\.(?:jpg|gif|png)');
  if (!regex.test(user.picture)) {
    user.picture = 'profile-placeholder.png'
  }

  return user
}

users.subscribe((value) => {
  setLocalJson('halonostr/users', value)
})
