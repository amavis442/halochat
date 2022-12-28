import { addToast } from "../partials/Toast/toast";
import { getContactlist } from "./app";
import type { Follow } from "./types";
import { get, writable, type Writable } from 'svelte/store'
import { publish } from "./pool";
import { setLocalJson, getLocalJson, setting } from '../util/storage';

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

    let contact = {pubkey: pubkey, relay: '', petname:petname};
 
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

    return get(contacts)
}

/**
 * 
 */
async function saveContactList(): Promise<any> {
    let $contacts = get(contacts)
    let storeContacts = []
    $contacts.forEach(c =>{
        storeContacts.push(['p', c.pubkey, c.relay, c.petname])    
    })

    return publish(3, "", storeContacts).then(() => {
        addToast({
            message: "Contact list has been saved",
            type: "success",
            dismissible: true,
            timeout: 3000,
        });
    });
}

async function publishList(list: Array<{ pubkey: string, relay: string, petname: string }>): Promise<any> {
    let saveList = []
    list.forEach(c =>{
        saveList.push(['p', c.pubkey, c.relay, c.petname])    
    })

    return publish(3, "", saveList).then(() => {
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
                console.debug('Received contacts ', receivedContacts)
                receivedContacts.forEach((contact) => {
                    let list = contact.tags.filter((c) => c[0] == "p");
                    list.forEach((item) => {
                        if (!contactList.find((cl) => cl[1] == item[1])) {
                            contactList = [...contactList, item];
                        }
                    });
                });
                console.debug('Received contacts processed ', contactList)

                let contact:Array<{ pubkey: string, relay: string, petname: string }> = []
                contactList.forEach(cl => {
                    contact.push({pubkey: cl[1], relay: cl[2], petname: cl[3]})
                })
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
