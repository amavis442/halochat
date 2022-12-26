import { writable } from 'svelte/store'
import type { Follow } from '../state/types'
import { setLocalJson, getLocalJson } from '../util/storage'
import { now } from '../util/time'
import { prop, uniqBy } from "ramda";


export const followlist = writable(getLocalJson("halochat/followlist") || [])

followlist.subscribe((value) => {
    setLocalJson('halochat/followlist', value)
})

export const addFollow = (followUser: Follow) => {
    const defaults = {
        pubkey: '',
        petname: '',
        added: now(),
        user: {}
    }

    const t = { ...defaults, ...followUser }
    followlist.update((all) => uniqBy(prop("pubkey"), [t, ...all]))
}

export const dismissFollow = (pubkey: string) => {
    followlist.update((all) => all.filter((t: Follow) => t.pubkey !== pubkey))
}

export const updateFollow = (followUser: Follow) => {
    followlist.update((all) => uniqBy(prop("pubkey"),[followUser, ...all]))
}
