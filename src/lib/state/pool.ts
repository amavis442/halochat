import { writable, get } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/storage'
import {
  relayPool,
  signEvent,
  type Relay
} from "nostr-tools";
import { now } from "../util/time";
import type { Event } from './types'
import { head, values } from 'ramda';
import { account } from '../stores/account';

export const pool = relayPool();

//@ts-ignore does exist just not in index.d.ts
pool.onNotice((message: string, relay?: Relay) => {
  const url: string = relay.url
  console.debug(`Got an notice event from relay ${url}: ${message}`);
})

/**
 * id and sig are added in the pool.publish() function.
 * @see https://github.com/amavis442/nips/blob/master/01.md#events-and-signatures
 * @param kind 
 * @param content 
 * @param tags 
 * @returns 
 */
export const createEvent = async (kind: number, content: string = '', tags: string[][] = []): Promise<Event> => {
  const $account = get(account)
  const publicKey = $account.pubkey
  const createdAt = now()

  let note: Event = { kind: kind, content: content, tags: tags, pubkey: publicKey, created_at: createdAt }
  let sig: any = await signEvent(note, $account.privkey)
  return { ...note, sig }
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

  await pool.publish(event, (status: number, url: string) => {
    switch (status) {
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

export async function publishReply(content: string, replyToEvent: Event) {
  const $account = get(account)
  console.log($account.privkey)
  const publicKey = $account.pubkey
  const r = head(values(pool.getRelayList()))

  console.log(r)

  const tags: string[][] = [
    //@ts-ignore
    //['e', replyToEvent.id, r.relay.url, 'root'],
    //@ts-ignore
    ['e', replyToEvent.id, r.relay.url, 'reply'],
    ['p', replyToEvent.pubkey]
  ]
  if (publicKey != replyToEvent.pubkey) {
    tags.push(['p', publicKey])
  }
  const sendEvent = await createEvent(1, content, tags)
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
  const sendEvent = await createEvent(kind, content, tags)
  return pool.publish(sendEvent, (status: number) => { console.log('Message published. Status: ', status) })
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
