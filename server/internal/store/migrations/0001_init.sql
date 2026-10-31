-- 0001_init：P1 建表脚本，SQL 不含 SQLite 特有函数，便于后续迁移到 MySQL。

CREATE TABLE IF NOT EXISTS tasks (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NULL,
  capability        TEXT NOT NULL,
  model_id          TEXT NOT NULL,
  provider          TEXT NOT NULL,
  status            TEXT NOT NULL,
  phase             TEXT NOT NULL,
  progress          INTEGER NOT NULL DEFAULT 0,
  est_progress      INTEGER NOT NULL DEFAULT 1,
  progress_note     TEXT NOT NULL DEFAULT '',
  prompt            TEXT NOT NULL,
  negative_prompt   TEXT NOT NULL DEFAULT '',
  params_json       TEXT NOT NULL DEFAULT '{}',
  input_asset_ids   TEXT NOT NULL DEFAULT '[]',
  idempotency_key   TEXT NULL,
  provider_job_id   TEXT NOT NULL DEFAULT '',
  result_json       TEXT NULL,
  error_code        TEXT NOT NULL DEFAULT '',
  error_msg         TEXT NOT NULL DEFAULT '',
  cost_micros       BIGINT NOT NULL DEFAULT 0,
  attempt           INTEGER NOT NULL DEFAULT 0,
  cancel_requested  INTEGER NOT NULL DEFAULT 0,
  worker_id         TEXT NOT NULL DEFAULT '',
  next_run_at       BIGINT NOT NULL DEFAULT 0,
  timeout_at        BIGINT NOT NULL DEFAULT 0,
  created_at        BIGINT NOT NULL,
  updated_at        BIGINT NOT NULL,
  started_at        BIGINT NOT NULL DEFAULT 0,
  finished_at       BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tasks_idem ON tasks(idempotency_key);
CREATE INDEX IF NOT EXISTS ix_tasks_ready ON tasks(status, next_run_at);
CREATE INDEX IF NOT EXISTS ix_tasks_created ON tasks(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_tasks_user ON tasks(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS task_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     TEXT NOT NULL,
  type        TEXT NOT NULL,
  data        TEXT NOT NULL,
  created_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_events_task ON task_events(task_id, id);

CREATE TABLE IF NOT EXISTS assets (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL,
  kind         TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL DEFAULT 0,
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  sha256       TEXT NOT NULL DEFAULT '',
  source_url   TEXT NOT NULL DEFAULT '',
  created_at   BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_assets_task ON assets(task_id);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at BIGINT NOT NULL
);
