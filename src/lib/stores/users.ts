import { get, writable } from 'svelte/store'
import type { User } from '../state/types'
import { setLocalJson,getLocalJson } from '../util/storage'

export function addUser(user: User) {
  users.update(data => {
    if (data.find((item) => user.pubkey == item.pubkey)) {
      return data
    }
    let item = {}
    item[user.pubkey] = user
    if (data && data.length) {
        return data.concat(item)
    } else {
        data[user.pubkey] = user
        return data
    }
  })
}

export function removeUser(pubkey: string) {
  users.update(data => {
    return data.filter((value: User) => {
      return value.pubkey != pubkey
    })
  });
}

export const users = writable(getLocalJson('halonostr/users') || []);

users.subscribe((value) => {
  setLocalJson('halonostr/users', value)
})
