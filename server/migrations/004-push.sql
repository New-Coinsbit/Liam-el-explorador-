CREATE TABLE IF NOT EXISTS push_subscriptions (
 endpoint text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
 subscription jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
