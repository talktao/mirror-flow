// Package store 的 SQLite 实现。P1 单实例、单写连接，MySQL 在 P6 再换。
package store

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	// 下划线导入：只执行驱动包的 init()，把名为 "sqlite" 的驱动注册进 database/sql。
	// 代码里不会直接调用这个包，所以不写包名。
	_ "modernc.org/sqlite"

	"mirrorflow/server/internal/model"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// SQLite 实现 CanvasStore 接口；编译期断言，接口方法少实现一个就会在这里报错。
var _ CanvasStore = (*SQLite)(nil)

type SQLite struct {
	db *sql.DB
}

// OpenSQLite 打开数据库、执行迁移，并返回可用的 store。
//
// 注意 *SQLite 与 SQLite 的区别：Go 里带 * 表示指针。
// 指针接收者（func (s *SQLite) ...）修改的是同一个实例，避免复制 mutex / 连接池。
func OpenSQLite(ctx context.Context, path string) (*SQLite, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("创建数据目录失败: %w", err)
	}

	// _pragma 由 modernc/sqlite 驱动解析：WAL 提升并发读性能，busy_timeout 避免瞬时锁冲突。
	dsn := "file:" + path + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	// SQLite 同一时刻只允许一个写事务，P1 直接把连接数压到 1，避免 database is locked。
	db.SetMaxOpenConns(1)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := migrate(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &SQLite{db: db}, nil
}

func (s *SQLite) Close() error { return s.db.Close() }

func (s *SQLite) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }

// migrate 按文件名顺序执行 migrations/*.sql，已执行过的版本记录在 schema_migrations。
//
// fs.ReadDir 返回的条目已按文件名排序，所以 0001、0002 的先后顺序是稳定的。
func migrate(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at BIGINT NOT NULL
	)`)
	if err != nil {
		return fmt.Errorf("创建迁移记录表失败: %w", err)
	}

	entries, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return err
	}

	for _, entry := range entries {
		version := strings.TrimSuffix(entry.Name(), ".sql")

		var applied int
		if err := db.QueryRowContext(ctx,
			`SELECT COUNT(1) FROM schema_migrations WHERE version = ?`, version,
		).Scan(&applied); err != nil {
			return err
		}
		if applied > 0 {
			continue
		}

		body, err := migrationFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, string(body)); err != nil {
			return fmt.Errorf("执行迁移 %s 失败: %w", version, err)
		}
		if _, err := db.ExecContext(ctx,
			`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
			version, time.Now().UTC().UnixMilli(),
		); err != nil {
			return err
		}
	}
	return nil
}

func (s *SQLite) ListCanvases(ctx context.Context) ([]model.Canvas, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, description, created_at, updated_at
		FROM canvases
		ORDER BY updated_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	// defer 会在函数返回前执行；rows.Close 必须配对调用，否则连接不会归还连接池。
	defer rows.Close()

	// 用 make 预分配切片；len 为 0 时 json 会输出 [] 而不是 null。
	items := make([]model.Canvas, 0)
	for rows.Next() {
		var item model.Canvas
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	// rows.Err 用来捕获遍历中途的网络/IO 错误，只检查 rows.Next() 不够。
	return items, rows.Err()
}

func (s *SQLite) CreateCanvas(ctx context.Context, canvas *model.Canvas) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO canvases (id, name, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)`,
		canvas.ID, canvas.Name, canvas.Description, canvas.CreatedAt, canvas.UpdatedAt,
	)
	return err
}

func (s *SQLite) GetCanvas(ctx context.Context, canvasID string) (*model.Canvas, error) {
	var item model.Canvas
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, description, created_at, updated_at
		FROM canvases WHERE id = ?`, canvasID,
	).Scan(&item.ID, &item.Name, &item.Description, &item.CreatedAt, &item.UpdatedAt)

	// QueryRow 查不到时返回 sql.ErrNoRows，需要翻译成上层能识别的 ErrNotFound。
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &item, nil
}

func (s *SQLite) UpdateCanvas(ctx context.Context, canvas *model.Canvas) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE canvases
		SET name = ?, description = ?, updated_at = ?
		WHERE id = ?`,
		canvas.Name, canvas.Description, canvas.UpdatedAt, canvas.ID,
	)
	if err != nil {
		return err
	}
	// 不先查询再更新：受影响行数为 0 就说明记录不存在。
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *SQLite) DeleteCanvas(ctx context.Context, canvasID string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM canvases WHERE id = ?`, canvasID)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}
