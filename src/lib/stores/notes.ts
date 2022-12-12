import { times } from 'ramda'
import { writable } from 'svelte/store'
import type { Note } from '../state/types'

export const notes = writable([])

export const notePubKeys = []

export function updateNotes(note: Note) {

    notes.update(data => {
        if (data.find((item) => item.id == note.id)) {
            return data
        }
        let tags = note.tags.find(item => item[1] == 'e' && item[3] == 'reply')
        if (tags) {
            console.log('Found some reply tags',JSON.stringify(note.tags))
        }
        notePubKeys.push(note.pubkey)
        let item = {}
        item[note.id] = note
        if (data && data.length) {
            return data.concat(item)
        } else {
            data[note.id] = note
            return data
        }
    })
}
