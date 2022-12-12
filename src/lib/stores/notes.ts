import { writable, get } from 'svelte/store'
import { queue } from '../state/app'
import type { Note } from '../state/types'

export const notes = writable([])

export const noteReplyPubKeys = []

export function updateNotes(note: Note) {
    const q = get(queue)
    notes.update(data => {
        if (data.find((item) => item.id == note.id)) {
            return data
        }

        let tags = note.tags.find(item => item[0] == 'e' && item[3] == 'reply')
        if (tags) {
            note.reply_id = tags[1]
            if (!data[tags[1]]) {
                // else we need to fetch it somehow
                q.push(tags[1])
            }
        }

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
