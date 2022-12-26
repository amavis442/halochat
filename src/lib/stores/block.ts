import { writable } from 'svelte/store'
import { setLocalJson, getLocalJson } from '../util/storage'

export const blocklist = writable(getLocalJson("halochat/blocklist") || [])

blocklist.subscribe((value) => {
    setLocalJson('halochat/blocklist', value)
})

export const addBlock = (pubkey:string) => {
    // Push the toast to the top of the list of toasts
    blocklist.update((all) => [pubkey, ...all])
}
