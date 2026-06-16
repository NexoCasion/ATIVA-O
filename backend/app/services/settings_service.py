from __future__ import annotations

from fastapi import HTTPException

from ..auth import CurrentUser
from ..database import db_cursor
from ..schemas import SettingsResponse, SettingsUpdate
from ..security import iso_now
from .audit_service import log_event


def get_settings() -> SettingsResponse:
    with db_cursor() as cursor:
        rows = cursor.execute("SELECT key, value FROM system_settings").fetchall()
    data = {row["key"]: row["value"] for row in rows}
    return SettingsResponse(
        public_url=data.get("public_url", ""),
        company_name=data.get("company_name", "Oficina de Motos"),
        auto_refresh_seconds=int(data.get("auto_refresh_seconds", "15")),
    )


def update_settings(payload: SettingsUpdate, current_user: CurrentUser) -> SettingsResponse:
    settings = payload.model_dump()
    now = iso_now()
    with db_cursor(commit=True) as cursor:
        old_settings = get_settings().model_dump()
        for key, value in settings.items():
            cursor.execute(
                """
                INSERT INTO system_settings (key, value, updated_at, updated_by)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at,
                    updated_by = excluded.updated_by
                """,
                (key, str(value), now, current_user.username),
            )
        log_event(
            cursor,
            entity_type="settings",
            action="settings_updated",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            old_value=old_settings,
            new_value=settings,
            details="Configurações do sistema alteradas.",
        )
    return get_settings()
