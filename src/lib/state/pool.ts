import { writable, get } from 'svelte/store'
import { getLocalJson, setLocalJson } from '../util/storage'
import { now, delay } from "../util/time";
import { head } from 'ramda';
import { account } from '../stores/account';
import { getRootTag, getReplyTag } from '../util/tags';
import { log } from '../util/misc';
import {
  relayInit,
  getEventHash,
  signEvent,
  verifySignature,
  validateEvent,
  type Relay,
  type Event,
  type Filter,
  type Sub
} from 'nostr-tools'
import 'websocket-polyfill'
import { Listener } from './app';

export class relayPool {
  relays: { [key: string]: Relay } = {}

  addRelay = async (url: string) => {
    this.relays[url] = relayInit(url)
    await this.relays[url].connect()

    this.relays[url].on('error', () => {
      console.log(`failed to connect to ${url}`)
    })
    delay(500)

    //if (this.relays[url].status == 1) {
    this.relays[url].on('connect', () => {
      console.log(`connected to ${url}`)
    })


    this.relays[url].on('disconnect', () => {
      console.log(`Closing connection to ${url}`)
    })
    //}
  }

  removeRelay = (url: string) => {
    if (this.hasRelay(url)) {
      this.relays[url].close()
    }
  }

  publish = async (evt: Event) => {
    const $relays = get(relays)

    console.log(Object.entries($relays))
    for (const [url, relay] of Object.entries(this.relays)) {
      if ($relays[url].write && relay.status == 1) {
        let pub = relay.publish(evt)
        pub.on('ok', () => {
          console.log(`${url} has accepted our event`)
        })
        pub.on('seen', () => {
          console.log(`we saw the event on ${url}`)
        })
        pub.on('failed', (reason: any) => {
          console.log(`failed to publish to ${url}: ${reason}`)
        })
      }
      if (relay.status !== 1) {
        console.error(`Not publishing: Relay ${url} has state ${relay.status} and should be 1 = OPEN (0 CONNECTING, 1 OPEN, 2 CLOSING, 3 CLOSE)`)
      }
      if (!$relays[url].write) {
        console.error(`${url} has no write permissions set`)
      }
    }
    return
  }

  close = () => {
    for (const [url, relay] of Object.entries(this.relays)) {
      relay.close
    }
  }

  getRelays = (): { [key: string]: Relay } => {
    return this.relays
  }

  hasRelay = (url: string) => {
    return this.relays && this.relays[url] ? true : false
  }
}
export const pool = new relayPool()

//@ts-ignore does exist just not in index.d.ts
/* pool.onNotice((message: string, relay?: Relay) => {
  const url: string = relay.url
  log(`onNotice: Got a notice event from relay ${url}: ${message}`);
}) */

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

  let clientTag: Array<string> = ['client', 'halochat']
  if (!tags) {
    tags.push(clientTag)
  }
  if (tags) {
    tags = tags.filter((t) => t[0] != 'client')
    tags = [...tags, clientTag]
  }

  let note: Event = { kind: kind, content: content, tags: tags, pubkey: publicKey, created_at: createdAt }
  let sig: any = await signEvent(note, $account.privkey)
  let id: any = getEventHash(note)
  note = { ...note, sig, id }

  console.debug('VerifySignature', await verifySignature(note))
  console.debug('validateEvent', validateEvent(note))
  console.debug('createEvent:: ', note)
  return note
}

export const getData = async (filter: Filter): Promise<Event[]> => {
  return new Promise((resolve, reject) => {
    let subs: { [key: string]: Sub } = {}
    let result: Array<Event> = []
    let relayReturns: string[] = []
    const r = get(relays)
    const numRelays = r.length
    const subId = 'getter' + now()

    for (const [url, relay] of Object.entries(pool.getRelays())) {
      if (!r[url].write && relay.status !== 1) {
        relayReturns.push(url)
        continue
      }
      console.debug(`getData:: Getting data from ${url}`)
      subs[url] = relay.sub([filter], {})

      subs[url].on('event', (event: Event) => {
        console.debug(`getData:: Getting EVENT data from ${url}`, event)
        result.push(event)
        resolve({ result: result, subs: subs })
      })

      subs[url].on('eose', (r: any) => {
        console.debug(`getData:: Received EOSE from ${url}`)
        relayReturns.push(url)
        if (relayReturns.length >= numRelays) {
          resolve({ result: result, subs: subs })
        }
      })
    }
  })
    .then((data: { result: Event[], subs: { [key: string]: Sub } }) => {
      for (const [url, sub] of Object.entries(data.subs)) {
        sub.unsub()
        console.log(`getData unsub listeners for ${url} with an internal id`)
      }
      console.debug(`getData:: Results `, data.result)
      return data.result
    })
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
  log('publishAccount: ', event)
  pool.publish(event)
}

function copyTags(evt: Event) {
  let newtags = [];
  evt.tags.forEach((tag) => {
    let t = [];
    let add = true

    if (tag[3] == "reply") {
      t = [tag[0], tag[1], tag[2]];
    } else {
      t = tag;
    }
    if (tag[0] == 'p' && tag[1] == evt.pubkey) {
      add = false
    }
    if (add) {
      newtags.push(t);
    }
  });
  const relayUrls = Object.keys(get(relays))

  newtags.push(["p", evt.pubkey, head(relayUrls)]);
  newtags.push(["e", evt.id, head(relayUrls), "reply"]);

  let rootTag = getRootTag(newtags)
  let replyTag = getReplyTag(newtags)
  if (rootTag[1] != replyTag[1] && rootTag[3] != 'root') {
    let t = newtags.find(t => t[1] == rootTag[1] && t[0] == 'e')
    t[3] = 'root'
  }

  return newtags
}

export async function publishReply(content: string, evt: Event) {
  const tags: string[][] = copyTags(evt)
  const sendEvent = await createEvent(1, content, tags)

  log('publishReply: ', sendEvent)
  pool.publish(sendEvent)
}

export async function publishReaction(content: string, evt: Event) {
  //const tags: string[][] = copyTags(evt)
  let tags = evt.tags.filter(tag => tag.length >= 2 && (tag[0] == "e" || tag[0] == "p"))
  tags.push(['e', evt.id])
  tags.push(['p', evt.pubkey])
  tags.push(['client', 'halochat'])
  const sendEvent = await createEvent(7, content, tags)

  log('publishReaction: ', sendEvent)
  pool.publish(sendEvent)
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
  log('publish: ', sendEvent)
  return pool.publish(sendEvent)
}

export const relays = writable(getLocalJson("halonostr/relays") || [])

relays.subscribe($relays => {
  try {
    Object.keys(pool.getRelays()).forEach((url: string) => {
      if ($relays && !$relays[url]) {
        pool.removeRelay(url)
        log('Remove relay from pool:', url)
      }
    })
  } catch (error) {
    log("error", error)
  }

  if ($relays) {
    for (const [url, value] of Object.entries($relays)) {
      console.log(`${url}: permissions: ${JSON.stringify(value)}`);

      if (!pool.hasRelay(url)) {
        pool.addRelay(url)
        log('Add relay to pool: ', url)
      }
    }
  }
  setLocalJson("halonostr/relays", $relays)
})
