import { writable } from 'svelte/store'
import { setLocalJson, getLocalJson } from '../util/storage'
import { now } from '../util/time'

export const notes = writable(getLocalJson('halonostr/notes') || [])

export const noteReplyPubKeys = []
export let since = 0

notes.subscribe((value) => {
    setLocalJson('halonostr/notes', value)
})
