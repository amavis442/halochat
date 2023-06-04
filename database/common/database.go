package common

import (
	"database/sql"
	"errors"
)

var (
	ErrDuplicate    = errors.New("record already exists")
	ErrNotExists    = errors.New("row not exists")
	ErrUpdateFailed = errors.New("update failed")
	ErrDeleteFailed = errors.New("delete failed")
)

func CreateTables(db *sql.DB, createQuery string) error {
	query := `PRAGMA page_size=8192;
        PRAGMA journal_mode=MEMORY;
        PRAGMA cache_size=5000;
	` + createQuery + `
	VACUUM;
	`

	_, err := db.Exec(query)
	return err
}
