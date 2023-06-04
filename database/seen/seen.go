package seen

type Event struct {
	ID        int64
	Pubkey    string
	Kind      int
	CreatedAt int64
	Content   string
	Tags_full string
	Sig       string
}
