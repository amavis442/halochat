import { writable, get } from 'svelte/store'
import { getLocalJson, setLocalJson, setting } from '../util/storage'
import { now } from "../util/time";
import { account } from '../stores/account';
import { getRootTag, getReplyTag } from '../util/tags';
import { log } from '../util/misc';
import { addToast } from '../partials/Toast/toast';
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
} from 'nostr-tools';
import 'websocket-polyfill';
import { isAlive } from './app';
import { uniq } from 'ramda';

export class relayPool {
  relays: { [key: string]: Relay } = {}

  addRelay = (url: string) => {
    let relay = relayInit(url)
    relay.connect()
    //@ts-ignore is in it but not in the type declaration 
    relay.on('error', () => {
      console.log(`failed to connect to ${url}`)
      addToast({
        message: `failed to connect to ${url}`,
        type: "error",
        dismissible: true,
        timeout: 3000,
      })
    })

    relay.on('connect', () => {
      console.log(`connected to ${url}`)
    })

    relay.on('notice', (evt: Event) => {
      console.log(`Got an notice from ${url}`, evt)
    })

    relay.on('disconnect', () => {
      console.log(`Closing connection to ${url}`)
      if (relay.status == 3) relay.connect() //reconnect
    })

    this.relays[url] = relay
  }

  removeRelay = (url: string) => {
    if (this.hasRelay(url)) {
      this.relays[url].close()
      delete (this.relays[url])
    }
  }

  publish = async (evt: Event) => {
    const $relays = get(relays)

    console.log($relays)
    for (const [url, relay] of Object.entries(this.relays)) {
      let $relay = $relays.find((r: Relay) => r.url == url)
      if ($relay && $relay.write && relay.status == 1) {
        if (relay.status !== 1) {
          await waitForOpenConnection(relay)
        }
        let pub = relay.publish(evt)
        pub.on('ok', () => {
          console.log(`Publish: ${url} has accepted our event`, evt)
        })
        pub.on('seen', () => {
          console.log(`Publish: we saw the event on ${url}`, evt)
        })
        pub.on('failed', (reason: any) => {
          console.log(`Publish: failed to publish to ${url}: ${reason}`, evt)
        })
      }
      if (relay.status !== 1) {
        console.error(`Not publishing: Relay ${url} has state ${relay.status} and should be 1 = OPEN (0 CONNECTING, 1 OPEN, 2 CLOSING, 3 CLOSE)`)
      }
      if (!$relay.write) {
        console.error(`Publish: ${url} has no write permissions set`)
      }
    }
    return
  }

  close = () => {
    for (const [url, relay] of Object.entries(this.relays)) {
      console.log(`Closing connection to ${url}`)
      relay.close()
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

export const waitForOpenConnection = (relay: Relay) => {
  return new Promise((resolve, reject) => {
    const maxNumberOfAttempts = 10
    const intervalTime = 200 //ms

    let currentAttempt = 0
    const interval = setInterval(() => {
      if (currentAttempt > maxNumberOfAttempts - 1) {
        clearInterval(interval)
        reject(new Error(`Maximum number of attempts exceeded for relay ${relay.url}`))
      } else if (relay.status === 1) {
        clearInterval(interval)
        resolve(true)
      }
      if (relay.status == 2 || relay.status == 3) {
        relay.connect()
      }
      currentAttempt++
    }, intervalTime)
  })
}

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

  let note: Event & { id: string, sig: string } = { kind: kind, content: content, tags: tags, pubkey: publicKey, created_at: createdAt, id: '', sig: '' }
  let sig: any = signEvent(note, $account.privkey)
  let id: any = getEventHash(note)
  note = { ...note, sig, id }

  console.debug('VerifySignature', verifySignature(note))
  console.debug('validateEvent', validateEvent(note))
  console.debug('createEvent:: ', note)
  return note
}

export const getData = async (filter: Filter, name?:string): Promise<Event[]> => {
  const $relays = get(relays)
  const numRelays = $relays.length

  let connectionStatus = await isAlive()
  console.log('All relays connected: ', connectionStatus)

  return new Promise((resolve, reject) => {
    let subs: Array<Sub> = []
    let result: Array<Event> = []
    let relayReturns: string[] = []
    const subId = name ? name : 'getter' + now()

    if (!Object.entries(pool.getRelays()).length) {
      reject('Pool of relays is empty.')
    }

    for (const [url, relay] of Object.entries(pool.getRelays())) {
      //let $relay = $relays.find(r => r.url == url)
      let timeoutId = setTimeout(() => {
        subs.forEach(item => item.unsub())
        console.error(`getData:: Request(${subId}) took to long (15s) unsub all subscription to free slots. Filter/Request: ` + JSON.stringify(filter))
        resolve(result) // Resolve what we got. Relay can behave badly/slowish
      }, 30000);

      if (relay.status !== 1) {
        console.log(`Relay ${url} has status ${relay.status}`)

        relayReturns.push(url)
        if (relayReturns.length >= numRelays) {

          reject(new Error('No relays with open connection'))
        }
        continue
      }
      console.debug(`getData:: Request data from ${url}`)
      try {
        let sub = relay.sub([filter], { id: subId })
        subs.push(sub)

        sub.on('event', (event: Event) => {
          console.debug(`getData:: Getting EVENT data from ${url}`, event)
          result.push(event)
          //clearInterval(timeoutId)
          //subs.forEach(item => item.unsub())
          //resolve(result)
        })

        sub.on('eose', () => {
          console.debug(`getData:: Received EOSE from ${url}`)
          relayReturns.push(url)
          relayReturns = uniq(relayReturns)
          console.debug('ESOE', relayReturns.length, Object.entries(pool.getRelays()).length)
          if (relayReturns.length >= Object.entries(pool.getRelays()).length) {
            clearInterval(timeoutId)
            subs.forEach(item => item.unsub())
            uniq(result)
            resolve(result)
          }
        })
      } catch (error) {
        reject(error)
      }
    }
  })
    .then((data: Event[]) => {
      console.debug(`getData:: Results `, data)
      return data
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
  console.debug('publishAccount: ', event)
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

  let relays = pool.getRelays()
  let relayUrl = Object.keys(relays)[0]

  newtags.push(["p", evt.pubkey, relayUrl]);
  newtags.push(["e", evt.id, relayUrl, "reply"]);

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

  console.debug('publishReply: ', sendEvent)
  pool.publish(sendEvent)
}

export async function publishReaction(content: string, evt: Event) {
  //const tags: string[][] = copyTags(evt)
  let tags = evt.tags.filter(tag => tag.length >= 2 && (tag[0] == "e" || tag[0] == "p"))
  tags.push(['e', evt.id])
  tags.push(['p', evt.pubkey])
  const sendEvent = await createEvent(7, content, tags)

  console.debug('publishReaction: ', sendEvent)
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
  console.debug('publish: ', sendEvent)
  return pool.publish(sendEvent)
}

export const relays = writable(getLocalJson(setting.Relays) || [])
relays.subscribe($relays => {
  try {
    Object.keys(pool.getRelays()).forEach((url: string) => {
      if ($relays && !$relays.find((r: Relay) => r.url == url)) {
        pool.removeRelay(url)
        console.log('Remove relay from pool:', url)
      }
    })
  } catch (error) {
    log("error", error)
  }

  if ($relays) {
    for (const relay of $relays) {
      console.log(`${relay.url}: permissions: ${JSON.stringify(relay)}`);

      if (!pool.hasRelay(relay.url)) {
        pool.addRelay(relay.url)
        console.log('Add relay to pool: ', relay.url)
      }
    }
  }
  setLocalJson(setting.Relays, $relays)
})
