package main

import (
	"encoding/json"
	"log"
	"mime"
	"net/http"
)

func databases(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*") // for CORS
	w.WriteHeader(http.StatusOK)
	test := []string{}
	test = append(test, "Hello")
	test = append(test, "World")
	json.NewEncoder(w).Encode(test)
}

func main() {
	// Windows may be missing this
	mime.AddExtensionType(".js", "application/javascript")

	http.Handle("/test", http.HandlerFunc(databases))
	http.Handle("/", http.FileServer(http.Dir("dist")))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
