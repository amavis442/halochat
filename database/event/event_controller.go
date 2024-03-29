package event

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

var eventRepository *SQLiteRepository

type ReturnFollow struct {
	Status string  `json:"status"`
	Data   []Event `json:"data"`
}

func InitController(myDb *sql.DB) {
	eventRepository = NewSQLiteRepository(myDb)
	eventRepository.Migrate()
}

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

func Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS

	var evt Event
	err := json.NewDecoder(r.Body).Decode(&evt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var id string = evt.ID
	evtFound, err := eventRepository.GetByID(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if evtFound == nil {
		evtFound, err = eventRepository.Create(evt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	var evts []Event
	evts = append(evts, *evtFound)
	returnStatus := ReturnFollow{Status: "ok", Data: evts}
	json.NewEncoder(w).Encode(returnStatus)
}
