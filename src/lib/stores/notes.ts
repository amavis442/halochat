import { writable, get } from 'svelte/store'
import { queue } from '../state/app'
import type { Note } from '../state/types'
import { setLocalJson, getLocalJson } from '../util/storage'

export const notes = writable(getLocalJson('halonostr/notes') || [])

export const noteReplyPubKeys = []
export let since = 0
const hasEventTag = (tag:Array<string>) => tag[0] === 'e'

export function updateNotes(note: Note) {
    const q = get(queue)
    let $notes = get(notes)
    if (!$notes.length) {
        notes.set([])
    }

    notes.update((data: Array<Note>) => {
        try {
            if (data.length && data.find((item: Note) => item.id == note.id)) {
                return data
            }
        } catch (error) {
            console.log('Error: ', error, data, note)
            throw error
        }

        if (note.tags.some(hasEventTag)) {
            let tags = note.tags.find((item: Array<string>) => item[0] == 'e' && item[3] == 'reply')
            if (tags) {
                note.reply_id = tags[1]
                //note.replies.push(tags[1])
                if (!data[tags[1]]) {
                    // else we need to fetch it somehow
                    q.push(tags[1])
                }
            }
        }
        data.unshift(note)
        return data
    })
}

notes.subscribe((value) => {
    setLocalJson('halonostr/notes', value)
})
