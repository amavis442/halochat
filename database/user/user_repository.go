package user

import (
	"database/sql"
	"errors"
	"halochat/halochat-server/database/common"

	"github.com/mattn/go-sqlite3"
)

type SQLiteRepository struct {
	db *sql.DB
}

func NewSQLiteRepository(db *sql.DB) *SQLiteRepository {
	return &SQLiteRepository{
		db: db,
	}
}

const CreatQuery string = `
CREATE TABLE IF NOT EXISTS users (
	pubkey TEXT PRIMARY KEY, 
	relay TEXT, 
	name TEXT, 
	about TEXT, 
	picture TEXT, 
	content TEXT, 
	updated_at INTEGER
);
`

func (r *SQLiteRepository) Migrate() error {
	query := `
	PRAGMA page_size=8192;
    PRAGMA journal_mode=MEMORY;
    PRAGMA cache_size=5000;` + CreatQuery + `VACUUM;`
	_, err := r.db.Exec(query)
	return err
}

func (r *SQLiteRepository) Create(event Event) (*Event, error) {
	res, err := r.db.Exec("INSERT INTO event(pubkey, created_at) values(?,?)", event.Pubkey, event.CreatedAt)
	if err != nil {
		var sqliteErr sqlite3.Error
		if errors.As(err, &sqliteErr) {
			if errors.Is(sqliteErr.ExtendedCode, sqlite3.ErrConstraintUnique) {
				return nil, common.ErrDuplicate
			}
		}
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	event.ID = id

	return &event, nil
}

func (r *SQLiteRepository) All() ([]Event, error) {
	rows, err := r.db.Query("SELECT * FROM event")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var all []Event
	for rows.Next() {
		var event Event
		if err := rows.Scan(&event.ID, &event.Pubkey, &event.CreatedAt); err != nil {
			return nil, err
		}
		all = append(all, event)
	}
	return all, nil
}

func (r *SQLiteRepository) GetByPubkey(pubkey string) (*Event, error) {
	row := r.db.QueryRow("SELECT * FROM event WHERE pubkey = ?", pubkey)

	var event Event
	if err := row.Scan(&event.ID, &event.Pubkey, &event.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, common.ErrNotExists
		}
		return nil, err
	}
	return &event, nil
}

func (r *SQLiteRepository) Update(updated *Event) error {
	if updated.ID == 0 {
		return errors.New("invalid updated ID")
	}
	res, err := r.db.Exec("UPDATE event SET pubkey = ? WHERE id = ?", updated.Pubkey, updated.ID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return common.ErrUpdateFailed
	}

	return nil
}

func (r *SQLiteRepository) Delete(id int64) error {
	res, err := r.db.Exec("DELETE FROM event WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return common.ErrDeleteFailed
	}

	return err
}
