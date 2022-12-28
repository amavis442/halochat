import { writable } from 'svelte/store'
import { setLocalJson, getLocalJson, setting } from '../util/storage'

export const blocklist = writable(getLocalJson(setting.Blocklist) || [])

blocklist.subscribe((value) => {
    setLocalJson(setting.Blocklist, value)
})

export const addBlock = (pubkey:string) => {
    // Push the toast to the top of the list of toasts
    blocklist.update((all) => [pubkey, ...all])
}
