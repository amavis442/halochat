import { writable, get } from 'svelte/store'
import { queue, hasEventTag } from '../state/app'
import type { Note } from '../state/types'
import { setLocalJson, getLocalJson } from '../util/storage'
import { prop, sort, descend } from "ramda";

export const notes = writable(getLocalJson('halonostr/notes') || [])

export const noteReplyPubKeys = []
export let since = 0

export function updateNotes(note: Note) {
    let $notes = get(notes)
    if (!$notes.length) {
        notes.set([])
    }

    let byCreatedAt = descend<Note>(prop("created_at"));    
    notes.update((data: Array<Note>) => {
        try {
            if (data.length && data.find((item: Note) => item.id == note.id)) {
                return data
            }
        } catch (error) {
            console.log('Error: ', error, data, note)
            throw error
        }
        data.unshift(note)
        data = sort(byCreatedAt, data);
        return data
    })
}

notes.subscribe((value) => {
    setLocalJson('halonostr/notes', value)
})
