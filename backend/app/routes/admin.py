from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Query

from ..auth import CurrentUser, require_roles
from ..config import BACKUP_DIR, DATABASE_PATH
from ..schemas import AuditLogResponse, BackupResponse, PasswordChangeRequest, PersonResponse, PersonUpdate, SettingsResponse, SettingsUpdate, UserCreate, UserResponse, UserUpdate
from ..services.audit_service import list_audit_logs, log_event
from ..services.people_service import list_people, update_person
from ..services.settings_service import get_settings, update_settings
from ..services.user_service import change_password, create_user, list_users, update_user
from ..database import db_cursor
from ..security import iso_now

router = APIRouter()


@router.get("/admin/users", response_model=list[UserResponse])
def list_users_endpoint(
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> list[UserResponse]:
    return list_users()


@router.post("/admin/users", response_model=UserResponse)
def create_user_endpoint(
    payload: UserCreate,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> UserResponse:
    return create_user(payload, current_user)


@router.put("/admin/users/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    payload: UserUpdate,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> UserResponse:
    return update_user(user_id, payload, current_user)


@router.put("/admin/users/{user_id}/password", response_model=UserResponse)
def update_user_password_endpoint(
    user_id: int,
    payload: PasswordChangeRequest,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> UserResponse:
    return change_password(user_id, payload, current_user)


@router.get("/admin/people", response_model=list[PersonResponse])
def list_people_endpoint(
    person_type: str | None = Query(default=None, alias="type"),
    include_inactive: bool = False,
    search: str | None = None,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> list[PersonResponse]:
    return list_people(person_type=person_type, search=search, include_inactive=include_inactive)


@router.put("/admin/people/{person_id}", response_model=PersonResponse)
def update_person_endpoint(
    person_id: int,
    payload: PersonUpdate,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> PersonResponse:
    return update_person(person_id, payload, current_user)


@router.get("/admin/history", response_model=list[AuditLogResponse])
def audit_history_endpoint(
    seller_person_id: int | None = None,
    mechanic_person_id: int | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    start_date: str | None = None,
    end_date: str | None = None,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> list[AuditLogResponse]:
    return list_audit_logs(
        seller_person_id=seller_person_id,
        mechanic_person_id=mechanic_person_id,
        status_value=status_value,
        start_date=start_date,
        end_date=end_date,
        limit=300,
    )


@router.post("/admin/backup", response_model=BackupResponse)
def backup_endpoint(
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> BackupResponse:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    destination = BACKUP_DIR / f"activations-backup-{timestamp}.db"
    shutil.copy2(DATABASE_PATH, destination)
    with db_cursor(commit=True) as cursor:
        log_event(
            cursor,
            entity_type="backup",
            action="backup_created",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            new_value={"backup_path": str(destination)},
            details="Backup manual criado.",
        )
    return BackupResponse(backup_path=str(destination))


@router.get("/admin/settings", response_model=SettingsResponse)
def get_settings_endpoint(
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> SettingsResponse:
    return get_settings()


@router.put("/admin/settings", response_model=SettingsResponse)
def update_settings_endpoint(
    payload: SettingsUpdate,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> SettingsResponse:
    return update_settings(payload, current_user)
