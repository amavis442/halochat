export const allowedKeys = [
    'halochat/relays',
    'halochat/users',
    'halochat/notes',
    'halochat/account',
    'halochat/notestack',
    'halochat/blocklist',
    'halochat/blocktext',
    'halochat/followlist'
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
            console.error("Local Storage is full, Please empty data" , e);
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
        console.error("Local Storage is full, Please empty data", e);
    }
}
