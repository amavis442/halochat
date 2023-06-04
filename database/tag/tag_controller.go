package tag

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

func doSqlStuffEvent(myDb *sql.DB) {
	eventRepository := NewSQLiteRepository(myDb)
	if err := eventRepository.Migrate(); err != nil {
		log.Fatal(err)
	}

	gosamples := Event{
		Pubkey:    "GOSAMPLES",
		CreatedAt: time.Now().Unix(),
	}

	golang := Event{
		Pubkey:    "Golang official website",
		CreatedAt: time.Now().Unix(),
	}

	createdGosamples, err := eventRepository.Create(gosamples)
	if err != nil {
		log.Fatal(err)
	}
	createdGolang, err := eventRepository.Create(golang)
	if err != nil {
		log.Fatal(err)
	}

	all, err := eventRepository.All()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("\nAll websites:\n")
	for _, event := range all {
		fmt.Printf("website: %+v\n", event)
	}

	if err := eventRepository.Delete(createdGolang.ID); err != nil {
		log.Fatal(err)
	}

	createdGosamples.Pubkey = "Dot os "
	if err := eventRepository.Update(createdGosamples); err != nil {
		log.Fatal(err)
	}

	all, err = eventRepository.All()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("\nAll websites:\n")
	for _, event := range all {
		fmt.Printf("website: %+v\n", event)
	}
}
