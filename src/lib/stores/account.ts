import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson, setting } from '../util/storage'
import type { Account } from '../state/types'

export const account = writable(getLocalJson(setting.Account) || []);

account.subscribe(($account: Account) => {
  setLocalJson(setting.Account, $account)
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
