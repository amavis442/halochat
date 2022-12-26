# Halochat

WIP for nostr client in svelte and typescript.

Bugs

- [ ] Plenty. Need to clean redundant functions
- [ ] Loading of prefetched data should be in chunks for quicker responsiveness
- [x] Reply e tag and p tags still not clear when to use <root>
- [ ] Loading of meta data should not block main thread
- [x] Find a better way to present the notes in a tree fashion
- [ ] Need to find a way when data is loaded and new data is added, to make sure it is not disruptive when you are reading and the screen scrolls up or down to add new data

Features

- [x] Nip 01
- [x] Account update
- [x] Generate keys (Private/Public)
- [x] Replies
- [x] Upvotes/Downvotes
- [x] Preview links
- [ ] Infinite scroller
- [x] Follow
- [ ] Channels


Status as in [Nips](https://github.com/nostr-protocol/nips)

- [x] NIP-01: Basic protocol flow description
- [x] NIP-02: Contact List and Petnames
- [ ] NIP-04: Encrypted Direct Message
- [ ] NIP-05: Mapping Nostr keys to DNS-based internet identifiers
- [ ] NIP-06: Basic key derivation from mnemonic seed phrase
- [X] NIP-08: Handling Mentions (just replacement but no search / autocomplete)
- [x] NIP-09: Event Deletion
- [x] NIP-10: Conventions for clients' use of e and p tags in text events.
- [ ] NIP-11: Relay Information Document
- [ ] NIP-12: Generic Tag Queries
- [ ] NIP-14: Subject tag in text events.
- [x] NIP-15: End of Stored Events Notice
- [ ] NIP-16: Event Treatment
- [ ] NIP-19: bech32-encoded entities
- [x] NIP-25: Reactions
- [ ] NIP-26: Delegated Event Signing
- [ ] NIP-28: Public Chat
- [ ] NIP-35: User Discovery
- [ ] NIP-36: Sensitive Content
- [ ] NIP-40: Expiration Timestamp
