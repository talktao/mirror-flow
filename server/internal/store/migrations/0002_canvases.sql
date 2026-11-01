-- 0002_canvases：画布（项目）元数据。节点表在后续迁移里单独增加，这里只存名称与描述。
-- 时间统一用 BIGINT 毫秒（UTC），不依赖 SQLite 的日期函数。

CREATE TABLE IF NOT EXISTS canvases (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_canvases_updated ON canvases(updated_at DESC, id DESC);
