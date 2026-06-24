from __future__ import annotations

import sqlite3
from datetime import datetime

from fastapi import HTTPException, status

from ..database import db_cursor
from ..schemas import LoginRequest, LoginResponse, UserResponse
from ..security import (
    generate_session_token,
    hash_session_token,
    session_expiration_iso,
    verify_password,
    iso_now,
)
from .audit_service import log_event


REDIRECT_BY_PROFILE = {
    "ADMIN": "/admin",
    "VENDEDOR": "/vendedor",
    "OFICINA": "/oficina",
}


def row_to_user(row: sqlite3.Row) -> UserResponse:
    return UserResponse(
        id=row["id"],
        name=row["name"],
        username=row["username"],
        profile=row["profile"],
        active=bool(row["active"]),
        must_change_password=bool(row["must_change_password"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
        last_login=datetime.fromisoformat(row["last_login"]) if row["last_login"] else None,
    )


def login(payload: LoginRequest) -> LoginResponse:
    username = payload.username.strip().lower()
    with db_cursor(commit=True) as cursor:
        row = cursor.execute(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
            (username,),
        ).fetchone()

        if row is None or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário ou senha inválidos.",
            )

        if not bool(row["active"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário inativo. Procure o administrador.",
            )

        token = generate_session_token()
        token_hash = hash_session_token(token)
        now = iso_now()
        cursor.execute(
            """
            INSERT INTO user_sessions (
                user_id,
                token_hash,
                created_at,
                last_used_at,
                expires_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (row["id"], token_hash, now, now, session_expiration_iso()),
        )
        cursor.execute(
            "UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?",
            (now, now, row["id"]),
        )
        refreshed = cursor.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
        log_event(
            cursor,
            entity_type="auth",
            entity_id=row["id"],
            action="login_success",
            performed_by_user_id=row["id"],
            performed_by_login=row["username"],
            new_value={"profile": row["profile"]},
            details="Login realizado com sucesso.",
        )

    return LoginResponse(
        token=token,
        redirect_path=REDIRECT_BY_PROFILE[refreshed["profile"]],
        user=row_to_user(refreshed),
    )


def get_user_by_session_token(token: str) -> sqlite3.Row | None:
    token_hash = hash_session_token(token)
    now = iso_now()
    with db_cursor() as cursor:
        row = cursor.execute(
            """
            SELECT users.*
            FROM user_sessions
            INNER JOIN users ON users.id = user_sessions.user_id
            WHERE user_sessions.token_hash = ?
              AND user_sessions.revoked_at IS NULL
              AND user_sessions.expires_at >= ?
            """,
            (token_hash, now),
        ).fetchone()
        if row is None or not bool(row["active"]):
            return None

        return row


def logout(token: str, performed_by_login: str) -> None:
    token_hash = hash_session_token(token)
    with db_cursor(commit=True) as cursor:
        session_row = cursor.execute(
            """
            SELECT user_sessions.user_id, users.username
            FROM user_sessions
            INNER JOIN users ON users.id = user_sessions.user_id
            WHERE user_sessions.token_hash = ? AND user_sessions.revoked_at IS NULL
            """,
            (token_hash,),
        ).fetchone()
        if session_row is None:
            return
        cursor.execute(
            "UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ?",
            (iso_now(), token_hash),
        )
        log_event(
            cursor,
            entity_type="auth",
            entity_id=session_row["user_id"],
            action="logout",
            performed_by_user_id=session_row["user_id"],
            performed_by_login=performed_by_login,
            details="Logout executado.",
        )
