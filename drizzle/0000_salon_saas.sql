CREATE TABLE tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', plan TEXT NOT NULL DEFAULT 'Standard', fee REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', created INTEGER NOT NULL, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL, tenant_id TEXT REFERENCES tenants(id), active INTEGER NOT NULL DEFAULT 1, must_change INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE workspace_state (tenant_id TEXT PRIMARY KEY REFERENCES tenants(id), data TEXT NOT NULL DEFAULT '{}', version INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, tenant_id TEXT, detail TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, blocked_until INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL);
