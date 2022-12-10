import { writable, derived } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'

export const relays = writable(getLocalJson("halonostr/relays") || []);
export const filterRelay = writable('');

export function addRelay(url: string) {
    relays.update(data => {
        const result = data.find((value: string) => value.includes(url))
        if (!result) {
            return [...data, url]
        }
        return data
    })
}

export function removeRelay(url: string) {
    relays.update(data => {
        return data.filter((value: string) => {
            return value != url
        })
    });
}

export const f = derived(
    [relays, filterRelay],
    ([$relays, $filterRelay]) => {
        return $relays.find((value: string) => value.includes($filterRelay))
    }
)

relays.subscribe($relays => {
    setLocalJson("halonostr/relays", $relays)
})
