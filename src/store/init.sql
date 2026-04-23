CREATE TABLE IF NOT EXISTS pages (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   slug TEXT NOT NULL UNIQUE,
   type TEXT NOT NULL,
   title TEXT NOT NULL,
   compiled_truth TEXT NOT NULL DEFAULT '',
   timeline TEXT NOT NULL DEFAULT '',
   frontmatter TEXT NOT NULL DEFAULT '{}',
   content_hash TEXT,
   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create chunks full-text search table
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
   page_id UNINDEXED,
   page_title,
   page_slug,
   chunk_index UNINDEXED,
   chunk_text,
   chunk_source UNINDEXED,
   token_count UNINDEXED,
   chunk_text_segmented,
   tokenize='porter unicode61'
);

-- Create content_chunks table (real data)
CREATE TABLE IF NOT EXISTS content_chunks (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   chunk_index INTEGER NOT NULL,
   chunk_text TEXT NOT NULL,
   chunk_source TEXT NOT NULL DEFAULT 'compiled_truth',
   model TEXT NOT NULL DEFAULT 'text-embedding-3-large',
   token_count INTEGER,
   embedded_at DATETIME,
   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   UNIQUE(page_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS tags (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   tag TEXT NOT NULL,
   UNIQUE(page_id, tag)
);

-- Create page_versions table for history
CREATE TABLE IF NOT EXISTS page_versions (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   compiled_truth TEXT NOT NULL,
   frontmatter TEXT NOT NULL DEFAULT '{}',
   snapshot_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS links (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   from_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   to_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   link_type TEXT NOT NULL DEFAULT '',
   context TEXT NOT NULL DEFAULT '',
   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   UNIQUE(from_page_id, to_page_id)
);

CREATE TABLE IF NOT EXISTS timeline_entries (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   date TEXT NOT NULL,
   source TEXT NOT NULL DEFAULT '',
   summary TEXT NOT NULL,
   detail TEXT NOT NULL DEFAULT '',
   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_data (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
   source TEXT NOT NULL,
   data TEXT NOT NULL,
   fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   UNIQUE(page_id, source)
);

CREATE TABLE IF NOT EXISTS files (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
   filename TEXT NOT NULL,
   storage_path TEXT NOT NULL UNIQUE,
   mime_type TEXT,
   size_bytes INTEGER,
   content_hash TEXT NOT NULL,
   metadata TEXT NOT NULL DEFAULT '{}',
   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingest_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    pages_updated TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    scopes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    revoked_at DATETIME
);

CREATE TABLE IF NOT EXISTS mcp_request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_name TEXT,
    operation TEXT NOT NULL,
    latency_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'success',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);