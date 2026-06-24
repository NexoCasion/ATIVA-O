PRAGMA journal_mode = DELETE;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile TEXT NOT NULL CHECK (profile IN ('ADMIN', 'VENDEDOR', 'OFICINA')),
    active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_profile ON users (profile);

CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('VENDEDOR', 'MECANICO')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(normalized_name, type)
);

CREATE INDEX IF NOT EXISTS idx_people_type_active ON people (type, active);

CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorcycle_model TEXT NOT NULL,
    chassis TEXT NOT NULL,
    order_date TEXT,
    seller TEXT NOT NULL DEFAULT '',
    seller_responsible_id INTEGER,
    mechanic_responsible_id INTEGER,
    activation_date TEXT NOT NULL,
    activation_time TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_cpf TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    mechanic_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em andamento', 'Finalizado', 'Cancelado')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    last_changed_by TEXT NOT NULL,
    deleted_at TEXT,
    deleted_by TEXT,
    FOREIGN KEY (seller_responsible_id) REFERENCES people (id),
    FOREIGN KEY (mechanic_responsible_id) REFERENCES people (id)
);

CREATE INDEX IF NOT EXISTS idx_activations_activation_date ON activations (activation_date);
CREATE INDEX IF NOT EXISTS idx_activations_status ON activations (status);
CREATE INDEX IF NOT EXISTS idx_activations_seller ON activations (seller);
CREATE INDEX IF NOT EXISTS idx_activations_chassis ON activations (chassis);

CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (token_hash);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    performed_by_user_id INTEGER,
    performed_by_login TEXT NOT NULL,
    performed_at TEXT NOT NULL,
    seller_person_id INTEGER,
    mechanic_person_id INTEGER,
    motorcycle_status TEXT,
    old_value_json TEXT,
    new_value_json TEXT,
    details TEXT,
    FOREIGN KEY (performed_by_user_id) REFERENCES users (id),
    FOREIGN KEY (seller_person_id) REFERENCES people (id),
    FOREIGN KEY (mechanic_person_id) REFERENCES people (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs (performed_at);

CREATE TABLE IF NOT EXISTS activation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activation_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    FOREIGN KEY (activation_id) REFERENCES activations (id)
);

CREATE INDEX IF NOT EXISTS idx_activation_history_activation_id ON activation_history (activation_id);
