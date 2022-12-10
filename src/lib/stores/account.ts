import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'
import type { Account } from '../state/types'

export const account = writable(getLocalJson("halonostr/account") || []);

account.subscribe($account => {
  setLocalJson("halonostr/account", $account)
})

export function deleteAccount(pubkey: string) {
  account.update((data) => {
    return ''
  })
}

export function updateAccount(pubkey: string, privkey: string, name?: string | null, about?: string | null, picture?: string | null) {
  account.update((data) => {
    const ac: Account = {
      pubkey: pubkey,
      privkey: privkey,
      name: name ? name : '',
      about: about ? about : '',
      picture: picture ? picture : ''
    }
    return ac
  })
}
