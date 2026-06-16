from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .config import DATABASE_PATH, DEFAULT_PUBLIC_URL, SCHEMA_PATH
from .security import hash_password


def ensure_database_directory() -> None:
    Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_database_directory()
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    connection.execute("PRAGMA journal_mode = WAL;")
    return connection


@contextmanager
def db_cursor(commit: bool = False) -> Iterator[sqlite3.Cursor]:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        yield cursor
        if commit:
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def _table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    return {
        row["name"]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }


def _seed_default_users(connection: sqlite3.Connection) -> None:
    now = iso_now()
    defaults = [
        ("Administrador", "admin", "admin123", "ADMIN", 1),
        ("Vendedor", "vendedor", "vendedor123", "VENDEDOR", 1),
        ("Oficina", "oficina", "oficina123", "OFICINA", 1),
    ]

    for name, username, password, profile, must_change_password in defaults:
        existing = connection.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if existing is None:
            connection.execute(
                """
                INSERT INTO users (
                    name,
                    username,
                    password_hash,
                    profile,
                    active,
                    must_change_password,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, 1, ?, ?, ?)
                """,
                (
                    name,
                    username,
                    hash_password(password),
                    profile,
                    must_change_password,
                    now,
                    now,
                ),
            )


def _seed_default_settings(connection: sqlite3.Connection) -> None:
    now = iso_now()
    settings = {
        "public_url": DEFAULT_PUBLIC_URL,
        "company_name": "Oficina de Motos",
        "auto_refresh_seconds": "15",
    }
    for key, value in settings.items():
        existing = connection.execute(
            "SELECT key FROM system_settings WHERE key = ?",
            (key,),
        ).fetchone()
        if existing is None:
            connection.execute(
                """
                INSERT INTO system_settings (key, value, updated_at, updated_by)
                VALUES (?, ?, ?, ?)
                """,
                (key, value, now, "system"),
            )


def normalize_person_name(name: str) -> str:
    return " ".join(str(name or "").strip().upper().split())


def _ensure_person(connection: sqlite3.Connection, name: str, person_type: str) -> int | None:
    cleaned = str(name or "").strip()
    if not cleaned:
        return None
    normalized = normalize_person_name(cleaned)
    existing = connection.execute(
        "SELECT id FROM people WHERE normalized_name = ? AND type = ?",
        (normalized, person_type),
    ).fetchone()
    if existing is not None:
        return int(existing["id"])

    now = iso_now()
    cursor = connection.execute(
        """
        INSERT INTO people (name, normalized_name, type, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
        """,
        (cleaned, normalized, person_type, now, now),
    )
    return int(cursor.lastrowid)


def _migrate_existing_activations(connection: sqlite3.Connection) -> None:
    activation_columns = _table_columns(connection, "activations")

    if "seller_responsible_id" not in activation_columns:
        connection.execute("ALTER TABLE activations ADD COLUMN seller_responsible_id INTEGER")
    if "mechanic_responsible_id" not in activation_columns:
        connection.execute("ALTER TABLE activations ADD COLUMN mechanic_responsible_id INTEGER")
    if "deleted_at" not in activation_columns:
        connection.execute("ALTER TABLE activations ADD COLUMN deleted_at TEXT")
    if "deleted_by" not in activation_columns:
        connection.execute("ALTER TABLE activations ADD COLUMN deleted_by TEXT")
    if "seller" not in activation_columns:
        connection.execute("ALTER TABLE activations ADD COLUMN seller TEXT NOT NULL DEFAULT ''")

    rows = connection.execute(
        """
        SELECT id, seller, seller_responsible_id
        FROM activations
        WHERE COALESCE(seller, '') <> ''
        """
    ).fetchall()
    for row in rows:
        seller_person_id = row["seller_responsible_id"]
        if seller_person_id is None:
            seller_person_id = _ensure_person(connection, row["seller"], "VENDEDOR")
            if seller_person_id is not None:
                connection.execute(
                    """
                    UPDATE activations
                    SET seller_responsible_id = ?
                    WHERE id = ?
                    """,
                    (seller_person_id, row["id"]),
                )

    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_activations_seller_responsible_id ON activations (seller_responsible_id)"
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_activations_mechanic_responsible_id ON activations (mechanic_responsible_id)"
    )


def _migrate_people_table(connection: sqlite3.Connection) -> None:
    columns = _table_columns(connection, "people")
    if "normalized_name" not in columns:
        connection.execute("ALTER TABLE people ADD COLUMN normalized_name TEXT")
        rows = connection.execute("SELECT id, name FROM people").fetchall()
        for row in rows:
            connection.execute(
                "UPDATE people SET normalized_name = ?, updated_at = COALESCE(updated_at, ?) WHERE id = ?",
                (normalize_person_name(row["name"]), iso_now(), row["id"]),
            )
    if "updated_at" not in columns:
        connection.execute("ALTER TABLE people ADD COLUMN updated_at TEXT")
        connection.execute("UPDATE people SET updated_at = COALESCE(created_at, ?)", (iso_now(),))


def iso_now() -> str:
    from datetime import datetime

    return datetime.now().isoformat(timespec="seconds")


def init_db() -> None:
    ensure_database_directory()
    schema_sql = Path(SCHEMA_PATH).read_text(encoding="utf-8")
    connection = get_connection()
    try:
        connection.executescript(schema_sql)
        _migrate_existing_activations(connection)
        _migrate_people_table(connection)
        _seed_default_users(connection)
        _seed_default_settings(connection)
        connection.commit()
    finally:
        connection.close()
