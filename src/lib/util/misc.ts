import type { Note } from '../state/types'

export function getLocalJson(k: string) {
    const data = localStorage.getItem(k);
    if (data) {
        try {
            return JSON.parse(data)
        } catch (e) {
            return null
        }
    }
    return null
}

export function setLocalJson(k: string, v: any) {
    try {
        localStorage.setItem(k, JSON.stringify(v))
    } catch (e) {
        // pass
    }
}

export function filter(notes: Array<Note>, pubkey: string) {
    const getNodes = (result: any, object: any) => {
        if (object.pubkey !== pubkey) {
            result.push(object);
            return result;
        }
        if (Array.isArray(object.replies)) {
            const nodes = object.replies.reduce(getNodes, []);
            if (nodes.length) result.push({ ...object, nodes });
        }
        return result;
    };

    return notes.reduce(getNodes, []);
}


export function find(note: Note, nodeId: string): Note | null {
    if (note.replies != null) {
        for (let i: number = 0; i < note.replies.length; i++) {
            let result = null
            result = note.replies.find(n => n.id == nodeId)
            if (result) return result
            
            let childNote = note.replies[i]
            if (childNote && childNote.replies && childNote.replies.length > 0) {
                result = find(childNote, nodeId)
                return result
            }
        }
    }     
    return null
}

export function deleteNodeFromTree(node:Note, nodeId: string) {
    if (node.replies != null) {
        for (let i = 0; i < node.replies.length; i++) {
            let filtered = node.replies.filter(f => f.id == nodeId);
            if (filtered && filtered.length > 0) {
                node.replies = node.replies.filter(f => f.id != nodeId);
                return;
            }
            deleteNodeFromTree(node.replies[i], nodeId);
        }
    }
}
