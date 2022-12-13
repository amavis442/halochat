import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'
import type { Account } from '../state/types'

export const account = writable(getLocalJson("halonostr/account") || []);

account.subscribe(($account: Account) => {
  setLocalJson("halonostr/account", $account)
})

export function deleteAccount() {
  account.set({})
}

export function updateAccount(pubkey: string, privkey: string, name?: string | null, about?: string | null, picture?: string | null) {
  account.update((data: Account) => {
    data = {
      pubkey: pubkey,
      privkey: privkey,
      name: name ? name : '',
      about: about ? about : '',
      picture: picture ? picture : ''
    }
    return data
  })
}
