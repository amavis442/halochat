package main

import (
	"context"
	"fmt"
	"log"

	"github.com/nbd-wtf/go-nostr"
)

func GetEvents() {
	ctx := context.Background()
	url := "wss://nostr.anchel.nl"
	relay, err := nostr.RelayConnect(ctx, url)
	//var filters nostr.Filters
	//var t nostr.Timestamp = nostr.Now()
	/*filters = []nostr.Filter{{
		Kinds: []int{0},
		//Since: &t,
		Limit: 3,
	}}*/

	filter := nostr.Filter{
		Kinds: []int{0},
		//Since: &t,
		Limit: 10,
	}

	//ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	evs, err := relay.QuerySync(ctx, filter)
	if err != nil {
		log.Fatal(err.Error())
		return
	}

	for _, ev := range evs {
		fmt.Println(ev.ID, ev.Content)
	}
}
