from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from ..auth import CurrentUser
from ..database import db_cursor, normalize_person_name
from ..schemas import PersonCreate, PersonResponse, PersonUpdate
from ..security import iso_now
from .audit_service import log_event


def row_to_person(row: sqlite3.Row) -> PersonResponse:
    return PersonResponse(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        active=bool(row["active"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def ensure_person(
    cursor: sqlite3.Cursor,
    *,
    name: str,
    person_type: str,
    actor: CurrentUser | None = None,
) -> sqlite3.Row:
    cleaned = str(name or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o nome do responsável.",
        )

    normalized = normalize_person_name(cleaned)
    existing = cursor.execute(
        """
        SELECT *
        FROM people
        WHERE normalized_name = ? AND type = ?
        """,
        (normalized, person_type),
    ).fetchone()
    if existing is not None:
        if not bool(existing["active"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{person_type.title()} inativo. Reative no painel do administrador.",
            )
        return existing

    now = iso_now()
    cursor.execute(
        """
        INSERT INTO people (name, normalized_name, type, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
        """,
        (cleaned, normalized, person_type, now, now),
    )
    person_id = cursor.lastrowid
    created = cursor.execute("SELECT * FROM people WHERE id = ?", (person_id,)).fetchone()
    log_event(
        cursor,
        entity_type="person",
        entity_id=person_id,
        action="person_created",
        performed_by_user_id=actor.id if actor else None,
        performed_by_login=actor.username if actor else "system",
        seller_person_id=person_id if person_type == "VENDEDOR" else None,
        mechanic_person_id=person_id if person_type == "MECANICO" else None,
        new_value=dict(created),
        details=f"{person_type} criado automaticamente.",
    )
    return created


def list_people(
    *,
    person_type: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
) -> list[PersonResponse]:
    query = "SELECT * FROM people WHERE 1 = 1"
    params: list[Any] = []
    if person_type:
        query += " AND type = ?"
        params.append(person_type)
    if not include_inactive:
        query += " AND active = 1"
    if search:
        query += " AND LOWER(name) LIKE LOWER(?)"
        params.append(f"%{search.strip()}%")
    query += " ORDER BY type ASC, active DESC, name ASC"

    with db_cursor() as cursor:
        rows = cursor.execute(query, params).fetchall()
    return [row_to_person(row) for row in rows]


def create_person(payload: PersonCreate, current_user: CurrentUser) -> PersonResponse:
    with db_cursor(commit=True) as cursor:
        row = ensure_person(cursor, name=payload.name, person_type=payload.type, actor=current_user)
    return row_to_person(row)


def update_person(person_id: int, payload: PersonUpdate, current_user: CurrentUser) -> PersonResponse:
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum dado enviado para atualizar o responsável.",
        )

    with db_cursor(commit=True) as cursor:
        current = cursor.execute("SELECT * FROM people WHERE id = ?", (person_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Responsável não encontrado.")

        updates: list[str] = []
        values: list[Any] = []

        if "name" in update_data:
            normalized = normalize_person_name(update_data["name"])
            conflict = cursor.execute(
                """
                SELECT id
                FROM people
                WHERE normalized_name = ? AND type = ? AND id <> ?
                """,
                (normalized, current["type"], person_id),
            ).fetchone()
            if conflict is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Já existe um responsável com este nome.",
                )
            updates.extend(["name = ?", "normalized_name = ?"])
            values.extend([update_data["name"], normalized])

        if "active" in update_data:
            updates.append("active = ?")
            values.append(1 if update_data["active"] else 0)

        updates.append("updated_at = ?")
        values.append(iso_now())
        values.append(person_id)

        cursor.execute(
            f"UPDATE people SET {', '.join(updates)} WHERE id = ?",
            values,
        )

        if "name" in update_data and current["type"] == "VENDEDOR":
            cursor.execute(
                "UPDATE activations SET seller = ? WHERE seller_responsible_id = ?",
                (update_data["name"], person_id),
            )

        updated = cursor.execute("SELECT * FROM people WHERE id = ?", (person_id,)).fetchone()
        log_event(
            cursor,
            entity_type="person",
            entity_id=person_id,
            action="person_updated",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=person_id if updated["type"] == "VENDEDOR" else None,
            mechanic_person_id=person_id if updated["type"] == "MECANICO" else None,
            old_value=dict(current),
            new_value=dict(updated),
            details="Responsável atualizado pelo ADMIN.",
        )

    return row_to_person(updated)
