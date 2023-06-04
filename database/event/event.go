package event

type Event struct {
	ID        string
	Pubkey    string
	Kind      int
	CreatedAt int64
	Content   string
	Tags_full string
	Sig       string
}
