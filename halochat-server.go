package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	follow "halochat/halochat-server/database"
	"log"
	"mime"
	"net/http"
	"os"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

const fileName = "sqlite.db"

func databases(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS
	w.WriteHeader(http.StatusOK)
	test := []string{}
	test = append(test, "Hello")
	test = append(test, "World")
	json.NewEncoder(w).Encode(test)
}

var myDb *sql.DB

func doSqlStuff() {
	followRepository := follow.NewSQLiteRepository(myDb)
	if err := followRepository.Migrate(); err != nil {
		log.Fatal(err)
	}

	gosamples := follow.Follow{
		Pubkey:    "GOSAMPLES",
		CreatedAt: time.Now().Unix(),
	}

	golang := follow.Follow{
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

// Todo
// Crud follow endpoints/
// Crud Block endpoints.
// Add events to database and return events from this database.

func main() {
	err := os.Remove(fileName)
	if err != nil {
		log.Fatal(err)
	}

	db, err := sql.Open("sqlite3", fileName)
	if err != nil {
		log.Fatal(err)
	}
	myDb = db

	defer db.Close()

	doSqlStuff()

	// Windows may be missing this
	mime.AddExtensionType(".js", "application/javascript")

	log.Println("Starting webserver and listen on http://localhost:8080")
	http.Handle("/test", http.HandlerFunc(databases))
	http.Handle("/", http.FileServer(http.Dir("dist")))
	log.Fatal(http.ListenAndServe(":8080", nil))

}
