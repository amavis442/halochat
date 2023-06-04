package event

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
CREATE TABLE IF NOT EXISTS events (
	id TEXT PRIMARY KEY, 
	pubkey TEXT, 
	kind INTEGER, 
	created_at INTEGER, 
	content TEXT, 
	tags_full TEXT, 
	sig TEXT
);
CREATE INDEX IF NOT EXISTS events_by_kind ON events (kind, created_at);
CREATE INDEX IF NOT EXISTS events_by_pubkey_kind ON events (pubkey, kind, created_at);
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
	_, err := r.db.Exec("INSERT INTO event(id, created_at) values(?,?)", event.ID, event.CreatedAt)
	if err != nil {
		var sqliteErr sqlite3.Error
		if errors.As(err, &sqliteErr) {
			if errors.Is(sqliteErr.ExtendedCode, sqlite3.ErrConstraintUnique) {
				return nil, common.ErrDuplicate
			}
		}
		return nil, err
	}

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

func (r *SQLiteRepository) GetByID(id string) (*Event, error) {
	row := r.db.QueryRow("SELECT * FROM event WHERE id = ?", id)

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
	if updated.ID == "" {
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

func (r *SQLiteRepository) Delete(id string) error {
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
