CREATE TABLE IF NOT EXISTS users (
    _id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS puzzles (
    _id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    title TEXT,
    puzzle_data TEXT NOT NULL,
    solution_data TEXT NOT NULL,
    board_size INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(_id)
);

CREATE TABLE IF NOT EXISTS challenges (
    _id INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    elapsed_time INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (puzzle_id) REFERENCES puzzles(_id),
    FOREIGN KEY (user_id) REFERENCES users(_id)
);
