from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from ..auth import CurrentUser
from ..database import db_cursor
from ..schemas import PasswordChangeRequest, UserCreate, UserResponse, UserUpdate
from ..security import hash_password, iso_now
from .audit_service import log_event
from .auth_service import row_to_user


def list_users() -> list[UserResponse]:
    with db_cursor() as cursor:
        rows = cursor.execute(
            "SELECT * FROM users ORDER BY active DESC, profile ASC, username ASC"
        ).fetchall()
    return [row_to_user(row) for row in rows]


def create_user(payload: UserCreate, current_user: CurrentUser) -> UserResponse:
    username = payload.username.lower()
    with db_cursor(commit=True) as cursor:
        existing = cursor.execute(
            "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
            (username,),
        ).fetchone()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um usuário de login com este nome.",
            )

        now = iso_now()
        cursor.execute(
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.name,
                username,
                hash_password(payload.password),
                payload.profile,
                1 if payload.active else 0,
                1 if payload.must_change_password else 0,
                now,
                now,
            ),
        )
        user_id = cursor.lastrowid
        row = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        log_event(
            cursor,
            entity_type="user",
            entity_id=user_id,
            action="user_created",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            new_value=dict(row),
            details="Usuário de login criado.",
        )
    return row_to_user(row)


def update_user(user_id: int, payload: UserUpdate, current_user: CurrentUser) -> UserResponse:
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado enviado para atualização.")

    with db_cursor(commit=True) as cursor:
        current = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")

        updates: list[str] = []
        values: list[Any] = []
        if "username" in update_data:
            username = update_data["username"].lower()
            conflict = cursor.execute(
                "SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id <> ?",
                (username, user_id),
            ).fetchone()
            if conflict is not None:
                raise HTTPException(status_code=400, detail="Nome de usuário já utilizado.")
            updates.append("username = ?")
            values.append(username)
            update_data["username"] = username

        for field in ("name", "profile", "active", "must_change_password"):
            if field in update_data:
                updates.append(f"{field} = ?")
                values.append(
                    1 if isinstance(update_data[field], bool) and update_data[field] else 0
                    if field in ("active", "must_change_password")
                    else update_data[field]
                )

        updates.append("updated_at = ?")
        values.append(iso_now())
        values.append(user_id)
        cursor.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
            values,
        )
        updated = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        log_event(
            cursor,
            entity_type="user",
            entity_id=user_id,
            action="user_updated",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            old_value=dict(current),
            new_value=dict(updated),
            details="Usuário de login atualizado.",
        )
    return row_to_user(updated)


def change_password(user_id: int, payload: PasswordChangeRequest, current_user: CurrentUser) -> UserResponse:
    with db_cursor(commit=True) as cursor:
        current = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")

        cursor.execute(
            """
            UPDATE users
            SET password_hash = ?, must_change_password = 0, updated_at = ?
            WHERE id = ?
            """,
            (hash_password(payload.password), iso_now(), user_id),
        )
        updated = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        log_event(
            cursor,
            entity_type="user",
            entity_id=user_id,
            action="password_changed",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            details="Senha alterada.",
        )
    return row_to_user(updated)


def delete_user(user_id: int, current_user: CurrentUser) -> None:
    with db_cursor(commit=True) as cursor:
        current = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")

        if current["id"] == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode excluir o próprio usuário enquanto está logado.",
            )

        if current["profile"] == "ADMIN":
            other_admin = cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM users
                WHERE profile = 'ADMIN' AND active = 1 AND id <> ?
                """,
                (user_id,),
            ).fetchone()
            if int(other_admin["total"] or 0) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mantenha pelo menos um usuário ADMIN ativo no sistema.",
                )

        log_event(
            cursor,
            entity_type="user",
            entity_id=user_id,
            action="user_deleted",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            old_value=dict(current),
            details="Usuário de login excluído.",
        )
        cursor.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
        cursor.execute("UPDATE audit_logs SET performed_by_user_id = NULL WHERE performed_by_user_id = ?", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
