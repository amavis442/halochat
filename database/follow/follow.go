package follow

type Follow struct {
	ID        int64  `json:"id"`
	Pubkey    string `json:"pubkey"`
	CreatedAt int64  `json:"created_at"`
}
