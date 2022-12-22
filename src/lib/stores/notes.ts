import { writable } from 'svelte/store'

export const notes = writable([])

export const noteReplyPubKeys = []
export let since = 0