CREATE TABLE IF NOT EXISTS schools (id text PRIMARY KEY, name text NOT NULL, approved boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, public_id text UNIQUE NOT NULL, role text NOT NULL CHECK(role IN ('student','teacher')),
 first_name text NOT NULL, last_name text NOT NULL, email text UNIQUE NOT NULL,
 password_hash text NOT NULL, parent_pin_hash text, school_id text REFERENCES schools(id),
 grade integer, birth_date text, subjects jsonb NOT NULL DEFAULT '[]', avatar integer NOT NULL DEFAULT 0,
 photo text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL,parent_until timestamptz);
CREATE TABLE IF NOT EXISTS rewards (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,title text NOT NULL,target integer NOT NULL CHECK(target>0),claimed boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS activities (id text PRIMARY KEY,owner_id text REFERENCES users(id) ON DELETE CASCADE,title text NOT NULL,subject text NOT NULL,questions jsonb NOT NULL,image text,reviewed boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS attempts (user_id text REFERENCES users(id) ON DELETE CASCADE,activity_id text REFERENCES activities(id) ON DELETE CASCADE,stars integer NOT NULL CHECK(stars BETWEEN 1 AND 3),score integer NOT NULL,PRIMARY KEY(user_id,activity_id));
CREATE TABLE IF NOT EXISTS classrooms (id text PRIMARY KEY,owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,name text NOT NULL,invite_code text UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS memberships (group_id text REFERENCES classrooms(id) ON DELETE CASCADE,user_id text REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(group_id,user_id));
CREATE TABLE IF NOT EXISTS shared_activities (group_id text REFERENCES classrooms(id) ON DELETE CASCADE,activity_id text REFERENCES activities(id) ON DELETE CASCADE,PRIMARY KEY(group_id,activity_id));
CREATE TABLE IF NOT EXISTS messages (id text PRIMARY KEY,group_id text NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reactions (message_id text REFERENCES messages(id) ON DELETE CASCADE,user_id text REFERENCES users(id) ON DELETE CASCADE,emoji text NOT NULL,PRIMARY KEY(message_id,user_id,emoji));
CREATE TABLE IF NOT EXISTS reports (id text PRIMARY KEY,reporter_id text REFERENCES users(id) ON DELETE CASCADE,message_id text REFERENCES messages(id) ON DELETE CASCADE,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS messages_group_date ON messages(group_id,created_at);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
