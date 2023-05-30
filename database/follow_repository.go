package follow

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"time"

	"github.com/mattn/go-sqlite3"
)

var (
	ErrDuplicate    = errors.New("record already exists")
	ErrNotExists    = errors.New("row not exists")
	ErrUpdateFailed = errors.New("update failed")
	ErrDeleteFailed = errors.New("delete failed")
)

type NullTime struct {
	Time  time.Time
	Valid bool // Valid is true if Time is not NULL
}

// Scan implements the Scanner interface.
func (nt *NullTime) Scan(value interface{}) error {
	nt.Time, nt.Valid = value.(time.Time)
	return nil
}

// Value implements the driver Valuer interface.
func (nt NullTime) Value() (driver.Value, error) {
	if !nt.Valid {
		return nil, nil
	}
	return nt.Time, nil
}

type SQLiteRepository struct {
	db *sql.DB
}

func NewSQLiteRepository(db *sql.DB) *SQLiteRepository {
	return &SQLiteRepository{
		db: db,
	}
}

func (r *SQLiteRepository) Migrate() error {
	query := `
    CREATE TABLE IF NOT EXISTS follow(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pubkey TEXT NOT NULL UNIQUE,
        created_at INT NOT NULL
    );
    `

	_, err := r.db.Exec(query)
	return err
}

func (r *SQLiteRepository) Create(follow Follow) (*Follow, error) {
	res, err := r.db.Exec("INSERT INTO follow(pubkey, created_at) values(?,?)", follow.Pubkey, follow.CreatedAt)
	if err != nil {
		var sqliteErr sqlite3.Error
		if errors.As(err, &sqliteErr) {
			if errors.Is(sqliteErr.ExtendedCode, sqlite3.ErrConstraintUnique) {
				return nil, ErrDuplicate
			}
		}
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	follow.ID = id

	return &follow, nil
}

func (r *SQLiteRepository) All() ([]Follow, error) {
	rows, err := r.db.Query("SELECT * FROM follow")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var all []Follow
	for rows.Next() {
		var follow Follow
		if err := rows.Scan(&follow.ID, &follow.Pubkey, &follow.CreatedAt); err != nil {
			return nil, err
		}
		all = append(all, follow)
	}
	return all, nil
}

func (r *SQLiteRepository) GetByPubkey(pubkey string) (*Follow, error) {
	row := r.db.QueryRow("SELECT * FROM follow WHERE pubkey = ?", pubkey)

	var follow Follow
	if err := row.Scan(&follow.ID, &follow.Pubkey, &follow.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotExists
		}
		return nil, err
	}
	return &follow, nil
}

func (r *SQLiteRepository) Update(updated *Follow) error {
	if updated.ID == 0 {
		return errors.New("invalid updated ID")
	}
	res, err := r.db.Exec("UPDATE follow SET pubkey = ? WHERE id = ?", updated.Pubkey, updated.ID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrUpdateFailed
	}

	return nil
}

func (r *SQLiteRepository) Delete(id int64) error {
	res, err := r.db.Exec("DELETE FROM follow WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDeleteFailed
	}

	return err
}
