import { writable } from 'svelte/store'
import { setLocalJson, getLocalJson } from '../util/storage'

export const notes = writable(getLocalJson('halonostr/notes') || [])

export const noteReplyPubKeys = []
export let since = 0

notes.subscribe((value) => {
    setLocalJson('halonostr/notes', value)
})
