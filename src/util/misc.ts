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
