import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'
import { now } from '../util/time'

export type User = {
  pubkey: string,
  name: string,
  about: string,
  picture: string,
  content: any,
  refreshed: number,
}

export function addUser(user: User) {
  users.update(data => {
 
    data[user.pubkey] = user

    const result = data.find((value: User) => value.pubkey.includes(user.pubkey))
    if (!result) {
      return [...data, user]
    }
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

export const users = writable(getLocalJson("halonostr/users") || {});

users.subscribe($users => {
  setLocalJson("halonostr/users", $users)
})
