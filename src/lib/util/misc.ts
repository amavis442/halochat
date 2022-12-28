import type { TextNote as Note } from '../state/types'

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

export function log(...args: any) 
{
    if (import.meta.env.DEV) {
        let e = (new Error())?.stack.split("\n")[2].trim()//.split(" ")[1]
        switch(args[0]) {
        case 'error':
            console.debug('Caller', e, args.shift())
            break;
        case 'info':
            console.debug('Caller', e, args.shift())
            break;
        default: 
            console.debug('Caller', e, args)
        }
        
    }
}
