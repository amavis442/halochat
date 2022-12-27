import { addToast } from "../stores/toast";
import { getContactlist } from "./app";
import type { Follow } from "./types";
import { get, writable } from 'svelte/store'
import { publish } from "./pool";

let contacts = writable([]); // Follow list
/**
 * 
 * @param pubkey 
 */
export function unFollow(pubkey: string):Array<string[]> {
    let $contacts = get(contacts)
    let c = $contacts.find((c) => c[1] == pubkey);
    $contacts = $contacts.filter((c) => c[1] != pubkey);

    addToast({
        message: "Removed: " + c[3].slice(0, 10),
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
function follow(pubkey: string, petname: string):Array<string[]> {
    let followUser: Follow = {
        pubkey: pubkey,
        petname: petname,
    };

    let contact = [];
    contact = ["p", pubkey, "", petname];

    console.log('Contact to follow', contact)
    
    contacts.update((all) => {
        console.log(all, contact)
        return [...all, contact]
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
    return publish(3, "", $contacts).then(() => {
        addToast({
            message: "Contact list has been saved",
            type: "success",
            dismissible: true,
            timeout: 3000,
        });
    });
}

async function publishList(list:string[][]): Promise<any> {
    return publish(3, "", list).then(() => {
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

                contacts.set(contactList);

                return contactList;
            }
        );
}

function getList() {
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
