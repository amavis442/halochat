import { writable, get } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/storage'
import {
  relayPool,
  signEvent,
  type Relay
} from "nostr-tools";
import { now } from "../util/time";
import { head, uniq } from 'ramda';
import { account } from '../stores/account';
import type { Event, Filter } from './types'
import { hasEventTag } from './app';

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

  let clientTag:Array<string> = ['client', 'halochat']
  if (!tags) {
    tags.push(clientTag)
  }
  if(tags) {
    tags = tags.filter((t) => t[0] != 'client')
    tags = [...tags, clientTag]
  }

  let note: Event = { kind: kind, content: content, tags: tags, pubkey: publicKey, created_at: createdAt }
  let sig: any = await signEvent(note, $account.privkey)
  return { ...note, sig }
}

/**
 * Taken from @see https://github.com/staab/coracle
 * @see https://github.com/staab/coracle/blob/master/src/state/nostr.js
 */
export class Channel {
  name: string
  p: Promise<any>

  constructor(name: string) {
    this.name = name
    this.p = Promise.resolve()
  }

  async sub(filter: Filter, cb: Function, onEose: Function | null) {
    // Make sure callers have to wait for the previous sub to be done
    // before they can get a new one.
    await this.p

    // If we don't have any relays, we'll wait forever for an eose, but
    // we already know we're done. Use a timeout since callers are
    // expecting this to be async and we run into errors otherwise.
    if (get(relays).length === 0) {
      setTimeout(onEose)

      return { unsub: () => { } }
    }

    let resolve: (value: any) => void
    const eoseRelays = []
    const sub = pool.sub(
      { filter, cb },
      this.name,
      //@ts-ignore
      (r: string) => {
        eoseRelays.push(r)

        if (eoseRelays.length === get(relays).length) {
          onEose(r)
        }
      })

    this.p = new Promise(r => {
      resolve = r
    })

    return {
      unsub: () => {
        sub.unsub()

        resolve(null)
      }
    }
  }
  all(filter: Filter): Promise<Array<Event>> {
    /**
     * @see https://eslint.org/docs/latest/rules/no-async-promise-executor
     */
    /* eslint no-async-promise-executor: 0 */
    return new Promise(async resolve => {
      const result = []

      const sub = await this.sub(
        filter,
        (e: Event) => result.push(e),
        (r: string) => {
          console.log('Eose from ', r)
          sub.unsub()

          resolve(result)
        },
      )
    })
  }
}

export const channels = {
  listener: new Channel('listener'),
  getter: new Channel('getter'),
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
  let isRoot = false
  if (!replyToEvent.tags.some(hasEventTag)) {
    // then this will be the start
    isRoot = true
  }

  let newtags = [];
  replyToEvent.tags.forEach((tag) => {
    let t = [];
    let add = true

    if (tag[3] == "reply") {
      t = [tag[0], tag[1], tag[2]];
    } else {
      t = tag;
    }
    if (tag[0] == 'p' && tag[1] == replyToEvent.pubkey) {
      add = false
    }
    if (add) {
      newtags.push(t);
    }
  });
  
  newtags.push(["p", replyToEvent.pubkey, head(get(relays))]);
  if (isRoot) {
    newtags.push(["e", replyToEvent.id, head(get(relays)), "root"]);
  } 
  newtags.push(["e", replyToEvent.id, head(get(relays)), "reply"]);
  const tags: string[][] = newtags
  const sendEvent = await createEvent(1, content, tags)

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
