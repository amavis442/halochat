import { writable, derived } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'

export const relays = writable(getLocalJson("halonostr/relays") || []);
export const filterRelay = writable('');

export function addRelay(url) {
    relays.update(data => {
        const result = data.find((value) => value.includes(url))
        if (!result) {
            return [...data, url]
        }
        return data
    })
}

export function removeRelay(url) {
    relays.update(data => {
        return data.filter((value) => {
            return value.url != url
        })
    });
}

export const f = derived(
    [relays, filterRelay],
    ([$relays, $filterRelay]) => {
        return $relays.find((value) => value.url.includes($filterRelay))
    }
)

relays.subscribe($relays => {
    setLocalJson("halonostr/relays", $relays)
})
