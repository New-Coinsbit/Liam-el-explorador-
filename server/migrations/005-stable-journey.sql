-- Once encountered, an activity stays after the levels assigned before it.
-- Sharing an older teacher activity must not reorder a child's existing path.
CREATE TABLE IF NOT EXISTS learning_path (
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_id text NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK(position>0),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,activity_id),UNIQUE(user_id,position)
);
