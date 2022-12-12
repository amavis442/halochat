import { get, writable } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'
import type { Event, User, Filter, Note, Reply } from './types'
import { uniqBy, prop, pluck, sortBy, last } from 'ramda'

export const notes = writable(getLocalJson("halonostr/notes") || {})

notes.subscribe($notes => {
    setLocalJson("halonostr/notes", $notes)
})

export function updateNotes(note:Note) {
    let $notes = get(notes)
    if (!$notes[note.id]) {
        sortBy(prop('created_at'), $notes)

        notes.update(data => {
            
                return data.concat(note)
            
        })
    }
}