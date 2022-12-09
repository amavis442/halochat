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

export function addAccount(pubkey:string, privkey:string) {
    account.update((data) => {
        const ac:Account = {
            pubkey : pubkey,
            privkey: privkey
        }
        return ac
    })
  }
