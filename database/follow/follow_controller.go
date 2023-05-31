package follow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

var followRepository *SQLiteRepository

type ReturnFollow struct {
	Status string   `json:"status"`
	Data   []Follow `json:"data"`
}

func InitController(myDb *sql.DB) {
	followRepository = NewSQLiteRepository(myDb)
	followRepository.Migrate()
}

func sampleData() {
	gosamples := Follow{
		Pubkey:    "GOSAMPLES",
		CreatedAt: time.Now().Unix(),
	}

	golang := Follow{
		Pubkey:    "Golang official website",
		CreatedAt: time.Now().Unix(),
	}

	createdGosamples, err := followRepository.Create(gosamples)
	if err != nil {
		log.Fatal(err)
	}
	createdGolang, err := followRepository.Create(golang)
	if err != nil {
		log.Fatal(err)
	}
	log.Println(createdGosamples, createdGolang)
}

func DoSqlStuffFollow() {
	if err := followRepository.Migrate(); err != nil {
		log.Fatal(err)
	}

	gosamples := Follow{
		Pubkey:    "GOSAMPLES",
		CreatedAt: time.Now().Unix(),
	}

	golang := Follow{
		Pubkey:    "Golang official website",
		CreatedAt: time.Now().Unix(),
	}

	createdGosamples, err := followRepository.Create(gosamples)
	if err != nil {
		log.Fatal(err)
	}
	createdGolang, err := followRepository.Create(golang)
	if err != nil {
		log.Fatal(err)
	}

	all, err := followRepository.All()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("\nAll websites:\n")
	for _, follow := range all {
		fmt.Printf("website: %+v\n", follow)
	}

	if err := followRepository.Delete(createdGolang.ID); err != nil {
		log.Fatal(err)
	}

	createdGosamples.Pubkey = "Dot os "
	if err := followRepository.Update(createdGosamples); err != nil {
		log.Fatal(err)
	}

	all, err = followRepository.All()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("\nAll websites:\n")
	for _, follow := range all {
		fmt.Printf("website: %+v\n", follow)
	}
}

func Index(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS
	w.WriteHeader(http.StatusOK)

	all, err := followRepository.All()
	if err != nil {
		log.Fatal(err)
	}
	returnStatus := ReturnFollow{Status: "ok", Data: all}

	json.NewEncoder(w).Encode(returnStatus)
}

func Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS

	var f Follow
	err := json.NewDecoder(r.Body).Decode(&f)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	follow, err := followRepository.GetByPubkey(f.Pubkey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if follow == nil {
		follow, err = followRepository.Create(f)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	var follows []Follow
	follows = append(follows, *follow)
	returnStatus := ReturnFollow{Status: "ok", Data: follows}
	json.NewEncoder(w).Encode(returnStatus)
}

func Get(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS

	var f Follow
	err := json.NewDecoder(r.Body).Decode(&f)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	follow, err := followRepository.GetByPubkey(f.Pubkey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if follow == nil {
		http.Error(w, "Follow not found", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	var follows []Follow
	follows = append(follows, *follow)
	returnStatus := ReturnFollow{Status: "ok", Data: follows}
	json.NewEncoder(w).Encode(returnStatus)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS

	var f Follow
	err := json.NewDecoder(r.Body).Decode(&f)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	follow, err := followRepository.GetByPubkey(f.Pubkey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if follow == nil {
		http.Error(w, "No follow to delete. Not found", http.StatusBadRequest)
		return
	}
	if follow != nil {
		err = followRepository.Delete(follow.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	var follows []Follow
	returnStatus := ReturnFollow{Status: "ok", Data: follows}
	json.NewEncoder(w).Encode(returnStatus)
}
