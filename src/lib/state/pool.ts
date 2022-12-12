import { writable, get } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/storage'
import {
  relayPool,
  getPublicKey,
  signEvent,
  type Filter,
  type Subscription,
  type SubscriptionCallback,
  type Relay
} from "nostr-tools";
import { now } from "../util/time";
import type { Event } from './types'
import { uniqBy, prop, pluck, head, values } from 'ramda';
import { account } from '../stores/account';

export const pool = relayPool();

//@ts-ignore does exist just not in index.d.ts
pool.onNotice((message: string, relay?:Relay) => {
  const url:string = relay.url
  console.debug(`Got an notice event from relay ${url}: ${message}`);
})

let _privateKey = ''
export const login = (privateKey: string) => {
  pool.setPrivateKey(privateKey)
  _privateKey = privateKey
}

const subscriptionId = Math.random().toString().slice(2);
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
  const data: any = [];

  //@ts-ignore
  const eoseRelays: string[] = []; //This one is optional according to the protocol.
  return await new Promise((resolve) => {
      const sub = pool.sub(
      {
        cb: (e) => data.push(e),
        filter: filter,
      },
      subscriptionId,
      //@ts-ignore
      (url: string) => {

        eoseRelays.push(url);
        //console.log('Avail relays: ', get(relays).length)
        if (eoseRelays.length == get(relays).length) {
          let result: Array<Event> = uniqBy(prop('id'), data)
          //sub.unsub();
          resolve(result);
        }

        setTimeout(() => {
          //sub.unsub();
          let result: Array<Event> = uniqBy(prop('id'), data)
          console.log('Timeout event for getting data from relays')
          resolve(result);
        }, 6000)
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
export const createEvent = async (kind: number, content:string = '', tags:string[][] = []): Promise<Event> => {
  //@ts-ignore
  const $account = get(account)
  const publicKey = $account.pubkey
  const createdAt = now()

  let note:Event = { kind: kind, content: content, tags: tags, pubkey: publicKey, created_at: createdAt }
  let sig:any = await signEvent(note, $account.privkey)
  return {...note, sig}
}

/**
 * Update meta data of user account
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 * @returns 
 */
export async function publishAccount() {
  const $account = get(account)
  const metadata = { name: $account.name, about: $account.about, picture: $account.picture }
  
  let event = await createEvent(0, JSON.stringify(metadata))

  await pool.publish(event, (status: number, url:string) => { 
    switch(status){
      case 0:
        console.info(`Account request send to ${url}`) 
      break
      case 1:
        console.info(`Account published by ${url}`)
        break
      default:
        console.error(`Unknown status ${status} while publishing account`)
    }
  })
}

export function publishReply(content: string, replyToEvent: Event) {
  const $account = get(account)
  _privateKey = $account.privkey
  console.log($account.privkey)
  pool.setPrivateKey($account.privkey)
  const publicKey = $account.pubkey
  const r = head(values(pool.getRelayList()))

  console.log(r)

  const tags:string[][] = [
    //@ts-ignore
    //['e', replyToEvent.id, r.relay.url, 'root'],
    //@ts-ignore
    ['e', replyToEvent.id, r.relay.url, 'reply'],
    ['p', replyToEvent.pubkey]
  ]
  if (publicKey != replyToEvent.pubkey) {
    tags.push(['p', publicKey])
  }
  const sendEvent = createEvent(1, content, tags)
  console.log(sendEvent)
  pool.publish(sendEvent, (status: number) => { console.log('Message published. Status: ', status) })
}

/**
 * 
 * @param kind Returns the even type when publish was successful
 * @param content 
 * @param tags 
 * @returns 
 */
export async function publish(kind: number, content = '', tags = []): Promise<any> {
  const $account = get(account)
  pool.setPrivateKey($account.privkey)
  const sendEvent = createEvent(kind, content, tags)
  console.log(sendEvent)
  return pool.publish(sendEvent, (status: number) => { console.log('Message published. Status: ', status) })
}


/**
 * Listen for socket message events. These can be of type EVENT or NOTICE 
 * @see https://github.com/amavis442/nips/blob/master/01.md#from-relay-to-client-sending-events-and-notices
 * @param onNote 
 * @returns 
 */
export function eventListener(onNote: SubscriptionCallback): Subscription {
  const subscriptionId = 'ListenTo' + Math.random().toString().slice(2);
  console.log("Start listening on channel: ", subscriptionId);
  //@ts-ignore
  const filter: Filter = { kinds: [0, 1, 5, 7], since: now() };
  //@ts-ignore
  return pool.sub(
    //@ts-ignore
    {
      cb: onNote,
      filter: filter,
    },
    subscriptionId,
    //@ts-ignore
    (url: any) => { console.log('Eose while listening', url) }
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
