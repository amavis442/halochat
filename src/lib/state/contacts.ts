import { addToast } from "../partials/Toast/toast";
import { getContactlist } from "./app";
import type { Follow, User } from "./types";
import { get, writable, type Writable } from 'svelte/store'
import { publish } from "./pool";
import { setLocalJson, getLocalJson, setting } from '../util/storage';
import { type Event } from 'nostr-tools';

/**
 * @see https://github.com/nostr-protocol/nips/blob/master/02.md
 * ['p',pubkey,relay, petname]
 */
let contacts: Writable<Array<{ pubkey: string, relay: string, petname: string }>> = writable(getLocalJson(setting.Contacts) || []); // Follow list
contacts.subscribe((value) => {
    setLocalJson(setting.Contacts, value)
})

/**
 * 
 * @param pubkey 
 */
export function unFollow(pubkey: string): Array<{ pubkey: string, relay: string, petname: string }> {
    let $contacts = get(contacts)
    let c = $contacts.find((c) => c.pubkey == pubkey);
    $contacts = $contacts.filter((c) => c.pubkey != pubkey);

    addToast({
        message: "Removed: " + c.petname.slice(0, 10),
        type: "success",
        dismissible: true,
        timeout: 3000,
    });

    return $contacts
}

/**
 * 
 * @param pubkey 
 * @param petname 
 */
function follow(pubkey: string, petname: string): Array<{ pubkey: string, relay: string, petname: string }> {
    let followUser: Follow = {
        pubkey: pubkey,
        petname: petname,
    };

    let contact = { pubkey: pubkey, relay: '', petname: petname };

    console.log('Contact to follow', contact)

    contacts.update((all) => {
        all.push(contact)
        console.log(all, contact)
        return all
    });

    pubkey = "";
    petname = "";

    addToast({
        message: "Following: " + followUser.petname,
        type: "success",
        dismissible: true,
        timeout: 3000,
    });

    let result = []
    let $contacts = get(contacts)
    for (let i = 0; i < $contacts.length; i++) {
        let c = $contacts[i];
        result.push(['p', c.pubkey, c.relay, c.petname]);
    }
    return result;
}

/**
 * 
 */
async function saveContactList(): Promise<any> {
    let $contacts = get(contacts)
    let storeContacts = []
    for (let i = 0; i < $contacts.length; i++) {
        let c = $contacts[i];
        storeContacts.push(['p', c.pubkey, c.relay, c.petname])
    }
    console.debug('Publish contacts to follow: ', storeContacts)
    /*
    return publish(3, "", storeContacts).then(() => {
        addToast({
            message: "Contact list has been saved",
            type: "success",
            dismissible: true,
            timeout: 3000,
        });
    });
    */
}

async function publishList(): Promise<any> {
    let $contacts = get(contacts)
    let storeContacts = []
    for (let i = 0; i < $contacts.length; i++) {
        let c = $contacts[i];
        storeContacts.push(['p', c.pubkey, c.relay, c.petname])
    }
    console.debug('Publish contacts to follow: ', storeContacts)
    
    return publish(3, "", storeContacts).then(() => {
        addToast({
            message: "Contact list has been saved",
            type: "success",
            dismissible: true,
            timeout: 3000,
        });
    });
    
}

/**
 * Get contact list from relays based on the given pubkey
 *  
 * @param pubkey 
 * @returns 
 */
async function getContacts(pubkey: string): Promise<any> {
    let contactList = [];
    return getContactlist(pubkey)
        .then(
            (receivedContacts) => {
                console.debug('Got contacts:', receivedContacts)
                for (let i = 0; i < receivedContacts.length; i++) {
                    let contact: Event = receivedContacts[i]
                    let list = contact.tags.filter((ct) => ct[0] == "p");
                    for (let n = 0; n < list.length; n++) {
                        let item = list[n]
                        if (!contactList.find((cl) => cl[1] == item[1])) {
                            contactList = [...contactList, item];
                        }
                    };
                };
                let contact: Array<{ pubkey: string, relay: string, petname: string }> = []
                for (let l = 0; l < contactList.length; l++) {
                    let cl = contactList[l]
                    contact.push({ pubkey: cl[1], relay: cl[2], petname: cl[3] })
                }
                contacts.set(contact);
                return contactList;
            }
        );
}

function getList(): Array<{ pubkey: string, relay: string, petname: string }> {
    return get(contacts)
}

export default {
    follow,
    unFollow,
    getContacts,
    saveContactList,
    getList,
    publishList
}
