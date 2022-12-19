import type {Note} from '../state/types'

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

export function filter(notes:Array<Note>, pubkey:string) {
    const getNodes = (result:any, object:any) => {
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
