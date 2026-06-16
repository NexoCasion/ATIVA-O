from __future__ import annotations

import json
import sqlite3
from typing import Any

from ..database import db_cursor
from ..schemas import AuditLogResponse
from ..security import iso_now


def dumps_json(data: Any) -> str | None:
    if data is None:
        return None
    return json.dumps(data, ensure_ascii=False, default=str)


def loads_json(data: str | None) -> dict[str, Any] | None:
    if not data:
        return None
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError:
        return {"raw": data}
    return parsed if isinstance(parsed, dict) else {"value": parsed}


def log_event(
    cursor: sqlite3.Cursor,
    *,
    entity_type: str,
    action: str,
    performed_by_login: str,
    entity_id: int | None = None,
    performed_by_user_id: int | None = None,
    seller_person_id: int | None = None,
    mechanic_person_id: int | None = None,
    motorcycle_status: str | None = None,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    details: str | None = None,
) -> None:
    cursor.execute(
        """
        INSERT INTO audit_logs (
            entity_type,
            entity_id,
            action,
            performed_by_user_id,
            performed_by_login,
            performed_at,
            seller_person_id,
            mechanic_person_id,
            motorcycle_status,
            old_value_json,
            new_value_json,
            details
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entity_type,
            entity_id,
            action,
            performed_by_user_id,
            performed_by_login,
            iso_now(),
            seller_person_id,
            mechanic_person_id,
            motorcycle_status,
            dumps_json(old_value),
            dumps_json(new_value),
            details,
        ),
    )


def row_to_audit_log(row: sqlite3.Row) -> AuditLogResponse:
    from datetime import datetime

    return AuditLogResponse(
        id=row["id"],
        entity_type=row["entity_type"],
        entity_id=row["entity_id"],
        action=row["action"],
        performed_by_login=row["performed_by_login"],
        performed_at=datetime.fromisoformat(row["performed_at"]),
        seller_person_id=row["seller_person_id"],
        seller_person_name=row["seller_person_name"],
        mechanic_person_id=row["mechanic_person_id"],
        mechanic_person_name=row["mechanic_person_name"],
        motorcycle_status=row["motorcycle_status"],
        old_value=loads_json(row["old_value_json"]),
        new_value=loads_json(row["new_value_json"]),
        details=row["details"],
    )


def list_audit_logs(
    *,
    entity_type: str | None = None,
    entity_id: int | None = None,
    seller_person_id: int | None = None,
    mechanic_person_id: int | None = None,
    status_value: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 200,
) -> list[AuditLogResponse]:
    query = """
        SELECT
            audit_logs.*,
            seller_people.name AS seller_person_name,
            mechanic_people.name AS mechanic_person_name
        FROM audit_logs
        LEFT JOIN people AS seller_people
            ON seller_people.id = audit_logs.seller_person_id
        LEFT JOIN people AS mechanic_people
            ON mechanic_people.id = audit_logs.mechanic_person_id
        WHERE 1 = 1
    """
    params: list[Any] = []

    if entity_type:
        query += " AND audit_logs.entity_type = ?"
        params.append(entity_type)
    if entity_id is not None:
        query += " AND audit_logs.entity_id = ?"
        params.append(entity_id)
    if seller_person_id is not None:
        query += " AND audit_logs.seller_person_id = ?"
        params.append(seller_person_id)
    if mechanic_person_id is not None:
        query += " AND audit_logs.mechanic_person_id = ?"
        params.append(mechanic_person_id)
    if status_value:
        query += " AND audit_logs.motorcycle_status = ?"
        params.append(status_value)
    if start_date:
        query += " AND DATE(audit_logs.performed_at) >= DATE(?)"
        params.append(start_date)
    if end_date:
        query += " AND DATE(audit_logs.performed_at) <= DATE(?)"
        params.append(end_date)

    query += " ORDER BY audit_logs.performed_at DESC, audit_logs.id DESC LIMIT ?"
    params.append(limit)

    with db_cursor() as cursor:
        rows = cursor.execute(query, params).fetchall()
    return [row_to_audit_log(row) for row in rows]
