export const allowedKeys = [
    'halonostr/relays',
    'halonostr/users',
    'halonostr/notes',
    'halonostr/account',
    'halonostr/notestack'
]

export function getLocalJson(k: string) {
    if (!allowedKeys.includes(k)) {
        throw new Error('Key [' + k + '] should be one of the following: ' + allowedKeys.toString())
    }

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
    if (!allowedKeys.includes(k)) {
        throw new Error('Key [' + k + '] should be one of the following: ' + allowedKeys.toString())
    }

    try {
        localStorage.setItem(k, JSON.stringify(v))
    } catch (e) {
        // pass
    }
}
