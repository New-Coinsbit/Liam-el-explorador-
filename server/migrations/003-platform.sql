ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student','teacher','parent'));
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_verified boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS guardian_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS family_links (
 parent_id text REFERENCES users(id) ON DELETE CASCADE,
 child_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY(parent_id,child_id)
);
CREATE TABLE IF NOT EXISTS account_tokens (
 token_hash text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('verify','reset')),expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_sessions(token_hash text PRIMARY KEY,expires_at timestamptz NOT NULL);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS path_order bigserial;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS grade_min integer NOT NULL DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS grade_max integer NOT NULL DEFAULT 11;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS goal text NOT NULL DEFAULT 'Repasar la clase';
CREATE TABLE IF NOT EXISTS attempt_history (
 id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_id text NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
 submission_id text NOT NULL,answers jsonb NOT NULL,result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,submission_id)
);
CREATE INDEX IF NOT EXISTS attempt_history_user_date ON attempt_history(user_id,created_at DESC);
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS claimed_by text REFERENCES users(id);
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS school_id text REFERENCES schools(id);
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS grade integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
CREATE TABLE IF NOT EXISTS contacts (
 id text PRIMARY KEY,requester_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 requester_approved boolean NOT NULL DEFAULT false,recipient_approved boolean NOT NULL DEFAULT false,
 blocked_by text REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(requester_id<>recipient_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_pair ON contacts(LEAST(requester_id,recipient_id),GREATEST(requester_id,recipient_id));
CREATE TABLE IF NOT EXISTS direct_messages (
 id text PRIMARY KEY,contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 body text NOT NULL,hidden boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS direct_reactions (
 message_id text REFERENCES direct_messages(id) ON DELETE CASCADE,user_id text REFERENCES users(id) ON DELETE CASCADE,
 emoji text NOT NULL,PRIMARY KEY(message_id,user_id,emoji)
);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS direct_message_id text REFERENCES direct_messages(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS challenges (
 id text PRIMARY KEY,contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_id text NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
 id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 body text NOT NULL,seen boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
