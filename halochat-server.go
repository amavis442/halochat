package main

import (
	"database/sql"
	"encoding/json"
	"halochat/halochat-server/database/follow"
	"log"
	"mime"
	"net/http"

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

// Todo
// Crud follow endpoints/
// Crud Block endpoints.
// Add events to database and return events from this database.

func main() {
	/*
		err := os.Remove(fileName)
		if err != nil {
			log.Fatal(err)
		}
	*/

	db, err := sql.Open("sqlite3", fileName)
	if err != nil {
		log.Fatal(err)
	}
	myDb = db

	defer db.Close()

	follow.InitController(myDb)

	// Windows may be missing this
	mime.AddExtensionType(".js", "application/javascript")

	log.Println("Starting webserver and listen on http://localhost:8080")
	http.Handle("/test", http.HandlerFunc(databases))

	http.Handle("/api/follow", http.HandlerFunc(follow.Index)) // Get all
	http.Handle("/api/follow/create", http.HandlerFunc(follow.Create))
	http.Handle("/api/follow/get", http.HandlerFunc(follow.Get))       // Get by pubkey
	http.Handle("/api/follow/delete", http.HandlerFunc(follow.Delete)) // Delete by pubkey

	http.Handle("/", http.FileServer(http.Dir("dist")))
	log.Fatal(http.ListenAndServe(":8080", nil))

}
