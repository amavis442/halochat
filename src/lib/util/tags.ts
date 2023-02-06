import { head } from "ramda";

export function getRootTag(tags: string[][]): string[] {
    let rootTag = head(tags.filter(t => t[0] == 'e' && t[3] == 'root'))
    if (rootTag) return rootTag
    for (let i = 0; i < tags.length; i++) {
        if (tags[i][0] == 'e') {
            return tags[i]
        }
    }

    return []
}

export function getReplyTag(tags: string[][]): string[] {
    let replyTag = head(tags.filter(t => t[0] == 'e' && t[3] == 'reply'))
    if (replyTag) return replyTag

    for (let i = tags.length - 1; i >= 0; i--) {
        if (tags[i][0] == 'e') {
            return tags[i]
        }
    }

    return []
}

export function getLastETag(tags: string[][]): string[] {
    for (let i = tags.length - 1; i > -1; i--) {
        if (tags[i][0] == 'e') {
            return tags[i]
        }
    }
    return []
}
