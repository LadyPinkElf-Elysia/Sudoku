-- schema.sql - 数独数据库设计（与新架构一致）
-- 字段名使用小写+下划线，前端通过 api.js 转换为 camelCase

CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY AUTOINCREMENT,
    uname TEXT UNIQUE NOT NULL,
    upwd TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS puzzles (
    pid INTEGER PRIMARY KEY AUTOINCREMENT,
    uid INTEGER NOT NULL,
    puzzle TEXT NOT NULL,          -- JSON 字符串，二维数字数组
    solution TEXT NOT NULL,        -- JSON 字符串，二维数字数组
    title TEXT DEFAULT '',
    board_size INTEGER NOT NULL DEFAULT 3,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(uid)
);

CREATE TABLE IF NOT EXISTS records (
    rid INTEGER PRIMARY KEY AUTOINCREMENT,
    uid INTEGER NOT NULL,
    pid INTEGER,                   -- NULL 表示系统生成题目
    won INTEGER NOT NULL DEFAULT 0, -- 0/1
    elapsed INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(uid),
    FOREIGN KEY (pid) REFERENCES puzzles(pid)
);