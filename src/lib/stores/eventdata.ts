import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/misc'

export const eventdata = writable(getLocalJson("halonostr/data") || [])

eventdata.subscribe($eventdata => {
    setLocalJson("halonostr/data", $eventdata)
})
