import { writable } from 'svelte/store'
import type { User } from '../state/types'
import { setLocalJson, getLocalJson } from '../util/storage'
import { now } from '../util/time';

export const users = writable(getLocalJson('halonostr/users') || []);

export function addUser(user: User) {
  users.update(data => {
    let foundUser = data.find((item) => user.pubkey == item.pubkey)
    if (foundUser) {
      if (foundUser.refreshed < now() - 60 * 60 * 10) {
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



users.subscribe((value) => {
  setLocalJson('halonostr/users', value)
})
