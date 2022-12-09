import { writable, get } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/storage'
import {
  relayPool,
  getPublicKey,
  type Filter,
  type Subscription,
  type SubscriptionCallback,
} from "nostr-tools";
import { now } from "../util/time";
import type { Event } from './types'

export const pool = relayPool();

//@ts-ignore does exist just not in index.d.ts
pool.onNotice((message: string) => {
  console.debug(`Got an notice event from one of the relays ${message}`);
})

let _privateKey = ''
export const login = (privateKey: string) => {
  pool.setPrivateKey(privateKey)
  _privateKey = privateKey
}

/**
 * Getter function.
 * 
 * Request a set of data and then close the subscription
 * These are abstracted in nostr-tools. This function is only for the REQ part to get the data
 * @see https://github.com/amavis442/nips/blob/master/01.md#from-client-to-relay-sending-events-and-creating-subscriptions
 * @param filter  
 * @returns 
 */
export async function getData(filter: {}): Promise<Array<Event>> {
  const subscriptionId = Math.random().toString().slice(2);
  const data: any = [];
  
  //@ts-ignore
  const eoseRelays: string[] = []; //This one is optional according to the protocol.
  return new Promise((resolve) => {
    const sub = pool.sub(
      {
        cb: (e) => data.push(e),
        filter: filter,
      },
      subscriptionId,
      //@ts-ignore
      (url: string) => {
        
        eoseRelays.push(url);
        console.log('Avail relays: ', get(relays).length)
        if (eoseRelays.length == get(relays).length) {
          sub.unsub();
          resolve(data);
        }

        setTimeout(() => {
          sub.unsub();
          resolve(data);
        }, 3000)
      }
    );
  });
}

/**
 * id and sig are added in the pool.publish() function.
 * @see https://github.com/amavis442/nips/blob/master/01.md#events-and-signatures
 * @param kind 
 * @param content 
 * @param tags 
 * @returns 
 */
export const createEvent = (kind: number, content = '', tags = []): any => {
  //@ts-ignore
  const publicKey = getPublicKey(_privateKey)
  const createdAt = now()

  return {kind, content, tags, publicKey, created_at: createdAt}
}

/**
 * 
 * @param kind Returns the even type when publish was successful
 * @param content 
 * @param tags 
 * @returns 
 */
export async function publish(kind: number, content = '', tags = []): Promise<any> {
  return pool.publish(createEvent(kind,content,tags), (status:number) => { console.log('Message published. Status: ', status)})
}


/**
 * Listen for socket message events. These can be of type EVENT or NOTICE 
 * @see https://github.com/amavis442/nips/blob/master/01.md#from-relay-to-client-sending-events-and-notices
 * @param onNote 
 * @returns 
 */
export function eventListener(onNote: SubscriptionCallback): Subscription {
  const subscriptionId = Math.random().toString().slice(2);
  console.log("Start listening on channel: ", subscriptionId);
  //@ts-ignore
  const filter: Filter = { kinds: [1, 5, 7], since: now() };
  //@ts-ignore
  return pool.sub(
    //@ts-ignore
    {
      cb: onNote,
      filter: filter,
    },
    subscriptionId,
    //@ts-ignore
    (url:any) => { console.log('Eose while listening', url)}
    );
}

export const relays = writable(getLocalJson("halonostr/relays") || [])

relays.subscribe($relays => {
  //@ts-ignore
  Object.keys(pool.relays).forEach((url: string) => {
    if (!$relays.includes(url)) {
      //@ts-ignore
      pool.removeRelay(url)
      console.log('Remove relay form pool:', url)
    }
  })

  $relays.forEach((url: string) => {
    //@ts-ignore
    if (!pool.relays[url]) {
      //@ts-ignore
      pool.addRelay(String(url))
      console.log('Add relay to pool: ', url)
    }
  })
  setLocalJson("halonostr/relays", $relays)
})
