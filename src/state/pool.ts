import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson} from '../util/misc'
import {
    relayPool,
    type Filter,
    type Subscription,
    type SubscriptionCallback,
  } from "nostr-tools";
  import { now } from "../util/time";
  
  export const pool = relayPool();
  
  export async function sendRequest(filter: {}): Promise<Array<any>> {
    const channel = Math.random().toString().slice(2);
    const data: any = [];
  
    //@ts-ignore
    const availableRelays = pool.relays.length;
    const eoseRelays: string[] = [];
  
    return new Promise((resolve) => {
      
      const sub = pool.sub(
        {
          cb: (e) => data.push(e),
          filter: filter,
        },
        channel,
        //@ts-ignore
        (url: string) => {
          eoseRelays.push(url);
          if (eoseRelays.length == availableRelays) {
            sub.unsub();
            resolve(data);
          }
        }
      );
    });
  }
  
  export function eventListener(onNote: SubscriptionCallback): Subscription {
    console.log("Start listening on channel: ", "listen");
    //@ts-ignore
    const filter: Filter = { kinds: [1, 5, 7], since: now() };
  
    return pool.sub(
      //@ts-ignore
      {
        cb: onNote,
        filter: filter,
      },
      "listen"
    );
  }
  
  export const relays = writable(getLocalJson("halonostr/relays") || [])

  relays.subscribe($relays => {
    //@ts-ignore
    Object.keys(pool.relays).forEach(url => {
      //@ts-ignore
      if (!$relays.includes(url)) {
        //@ts-ignore
        pool.removeRelay(url)
      }
    })
  
    $relays.forEach((url: String) => {
      //@ts-ignore
      if (!pool.relays[url]) {
        //@ts-ignore
        pool.addRelay(url)
      }
    })
  
    setLocalJson("halonostr/relays", $relays)
  })
