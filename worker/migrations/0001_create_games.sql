CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
  url TEXT NOT NULL,
  credit TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (length(id) BETWEEN 1 AND 60),
  CHECK (length(title) BETWEEN 1 AND 120),
  CHECK (length(description) BETWEEN 1 AND 1000),
  CHECK (url LIKE 'https://%')
);

CREATE INDEX IF NOT EXISTS games_category_title ON games(category, title COLLATE NOCASE);

INSERT OR IGNORE INTO games (id, title, category, description, tags, url, credit) VALUES
  ('2048', '2048', 'puzzle', 'Slide numbered tiles. Combine matching pairs. Chase the elusive 2048.', '["numbers","single-player","keyboard"]', 'https://play2048.co/', 'Gabriele Cirulli · MIT open-source project'),
  ('hextris', 'Hextris', 'arcade', 'Rotate a hexagon and match falling colors before the stack gets out of hand.', '["reflex","colors","single-player"]', 'https://hextris.io/', 'Hextris contributors · open-source project'),
  ('hexgl', 'HexGL', 'racing', 'A futuristic browser racing game. Best experienced with a desktop keyboard.', '["3d","racing","keyboard"]', 'https://hexgl.bkcore.com/play/', 'Thibaut Despoulain / BKcore · original creator site'),
  ('mines', 'Minesweeper', 'puzzle', 'Read the numbers, flag the mines, and clear the board.', '["logic","classic","single-player"]', 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/mines.html', 'Simon Tatham’s Portable Puzzle Collection · MIT'),
  ('net', 'Net', 'strategy', 'Rotate the tiles to connect every part of a tangled network.', '["logic","network","single-player"]', 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/net.html', 'Simon Tatham’s Portable Puzzle Collection · MIT'),
  ('towers', 'Towers', 'puzzle', 'Place skyscrapers on a grid and solve the skyline clues.', '["logic","numbers","single-player"]', 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/towers.html', 'Simon Tatham’s Portable Puzzle Collection · MIT');
