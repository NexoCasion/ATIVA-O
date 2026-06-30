from __future__ import annotations

import csv
import io
import sqlite3
from datetime import date, datetime, time, timedelta
from typing import Any

from fastapi import HTTPException, status

from ..auth import CurrentUser
from ..database import db_cursor
from ..schemas import (
    ActivationCreate,
    ActivationResponse,
    ActivationUpdate,
    AuditLogResponse,
    DashboardResponse,
    MechanicNotesUpdate,
    SchedulePreviewResponse,
    StatusUpdate,
)
from ..security import iso_now
from .audit_service import list_audit_logs, log_event
from .people_service import ensure_person

ALLOWED_STATUSES = ("Pendente", "Em andamento", "Finalizado", "Cancelado")
DAILY_ACTIVATION_LIMIT = 8
SAME_DAY_CUTOFF = time(10, 30)
DEFAULT_ACTIVATION_TIME = time(17, 0)


def is_business_day(target_date: date) -> bool:
    return target_date.weekday() < 5


def first_business_day_on_or_after(target_date: date) -> date:
    current = target_date
    while not is_business_day(current):
        current += timedelta(days=1)
    return current


def next_business_day(target_date: date) -> date:
    return first_business_day_on_or_after(target_date + timedelta(days=1))


def count_scheduled_activations_for_day(
    cursor: sqlite3.Cursor,
    target_date: date,
    *,
    exclude_activation_id: int | None = None,
) -> int:
    query = """
        SELECT COUNT(*) AS total
        FROM activations
        WHERE deleted_at IS NULL
          AND status <> 'Cancelado'
          AND activation_date = ?
    """
    params: list[Any] = [target_date.isoformat()]
    if exclude_activation_id is not None:
        query += " AND id <> ?"
        params.append(exclude_activation_id)

    row = cursor.execute(query, params).fetchone()
    return int(row["total"]) if row is not None else 0


def build_scheduling_message(
    scheduled_date: date,
    reasons: list[str],
    *,
    today: date,
) -> str:
    if scheduled_date == today:
        base_message = f"Ativacao programada para hoje ({scheduled_date.strftime('%d/%m/%Y')}) as 17:00."
    else:
        base_message = f"Ativacao programada para {scheduled_date.strftime('%d/%m/%Y')} as 17:00."

    if not reasons:
        return base_message
    return f"{base_message} Motivo: {'; '.join(reasons)}."


def calculate_activation_schedule(
    cursor: sqlite3.Cursor,
    order_date: date | None,
    *,
    now: datetime | None = None,
    exclude_activation_id: int | None = None,
) -> SchedulePreviewResponse:
    current_moment = now or datetime.now()
    today = current_moment.date()
    requested_date = order_date or today
    candidate_date = requested_date
    reasons: list[str] = []

    if candidate_date < today:
        candidate_date = today
        reasons.append("data de pedido anterior ao dia atual")

    if not is_business_day(candidate_date):
        candidate_date = first_business_day_on_or_after(candidate_date)
        reasons.append("data de pedido fora de dia util")

    if candidate_date == today and current_moment.time() > SAME_DAY_CUTOFF:
        candidate_date = next_business_day(candidate_date)
        reasons.append("cadastro realizado apos 10:30")

    while count_scheduled_activations_for_day(
        cursor,
        candidate_date,
        exclude_activation_id=exclude_activation_id,
    ) >= DAILY_ACTIVATION_LIMIT:
        candidate_date = next_business_day(candidate_date)
        if "limite diario de 8 ativacoes atingido" not in reasons:
            reasons.append("limite diario de 8 ativacoes atingido")

    return SchedulePreviewResponse(
        activation_date=candidate_date,
        activation_time=DEFAULT_ACTIVATION_TIME,
        scheduling_message=build_scheduling_message(candidate_date, reasons, today=today),
    )


def activation_base_query() -> str:
    return """
        SELECT
            activations.*,
            seller_people.name AS seller_responsible_name,
            mechanic_people.name AS mechanic_responsible_name
        FROM activations
        LEFT JOIN people AS seller_people
            ON seller_people.id = activations.seller_responsible_id
        LEFT JOIN people AS mechanic_people
            ON mechanic_people.id = activations.mechanic_responsible_id
        WHERE activations.deleted_at IS NULL
    """


def row_to_activation(
    row: sqlite3.Row,
    *,
    scheduling_message: str | None = None,
) -> ActivationResponse:
    return ActivationResponse(
        id=row["id"],
        motorcycle_model=row["motorcycle_model"],
        chassis=row["chassis"],
        order_date=date.fromisoformat(row["order_date"]) if row["order_date"] else None,
        seller_responsible_id=row["seller_responsible_id"],
        seller_responsible_name=row["seller_responsible_name"] or row["seller"],
        mechanic_responsible_id=row["mechanic_responsible_id"],
        mechanic_responsible_name=row["mechanic_responsible_name"],
        activation_date=date.fromisoformat(row["activation_date"]),
        activation_time=time.fromisoformat(row["activation_time"]),
        client_name=row["client_name"],
        client_cpf=row["client_cpf"],
        notes=row["notes"],
        mechanic_notes=row["mechanic_notes"],
        status=row["status"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
        created_by=row["created_by"],
        last_changed_by=row["last_changed_by"],
        scheduling_message=scheduling_message,
    )


def activation_snapshot(row: sqlite3.Row) -> dict[str, Any]:
    response = row_to_activation(row)
    return response.model_dump(mode="json")


def fetch_activation_or_404(cursor: sqlite3.Cursor, activation_id: int) -> sqlite3.Row:
    row = cursor.execute(
        f"{activation_base_query()} AND activations.id = ?",
        (activation_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Ativação não encontrada.")
    return row


def list_activations(
    *,
    activation_date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    seller: str | None = None,
    mechanic: str | None = None,
    seller_person_id: int | None = None,
    mechanic_person_id: int | None = None,
    status_value: str | None = None,
    chassis: str | None = None,
    client: str | None = None,
) -> list[ActivationResponse]:
    query = activation_base_query()
    params: list[Any] = []

    if activation_date:
        query += " AND activations.activation_date = ?"
        params.append(activation_date)
    if start_date:
        query += " AND activations.activation_date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND activations.activation_date <= ?"
        params.append(end_date)
    if seller:
        query += " AND LOWER(COALESCE(seller_people.name, activations.seller)) LIKE LOWER(?)"
        params.append(f"%{seller.strip()}%")
    if mechanic:
        query += " AND LOWER(COALESCE(mechanic_people.name, '')) LIKE LOWER(?)"
        params.append(f"%{mechanic.strip()}%")
    if seller_person_id is not None:
        query += " AND activations.seller_responsible_id = ?"
        params.append(seller_person_id)
    if mechanic_person_id is not None:
        query += " AND activations.mechanic_responsible_id = ?"
        params.append(mechanic_person_id)
    if status_value:
        query += " AND activations.status = ?"
        params.append(status_value)
    if chassis:
        query += " AND activations.chassis LIKE ?"
        params.append(f"%{chassis.strip().upper()}%")
    if client:
        query += " AND LOWER(activations.client_name) LIKE LOWER(?)"
        params.append(f"%{client.strip()}%")

    query += " ORDER BY activations.created_at ASC, activations.id ASC"

    with db_cursor() as cursor:
        rows = cursor.execute(query, params).fetchall()
    return [row_to_activation(row) for row in rows]


def get_activation(activation_id: int) -> ActivationResponse:
    with db_cursor() as cursor:
        row = fetch_activation_or_404(cursor, activation_id)
    return row_to_activation(row)


def preview_activation_schedule(order_date: date | None) -> SchedulePreviewResponse:
    with db_cursor() as cursor:
        return calculate_activation_schedule(cursor, order_date)


def create_activation(
    payload: ActivationCreate,
    current_user: CurrentUser,
    *,
    auto_schedule: bool = True,
) -> ActivationResponse:
    now = iso_now()
    with db_cursor(commit=True) as cursor:
        schedule_preview = calculate_activation_schedule(cursor, payload.order_date) if auto_schedule else None
        activation_date = schedule_preview.activation_date if schedule_preview else payload.activation_date
        activation_time = schedule_preview.activation_time if schedule_preview else payload.activation_time
        seller_person = ensure_person(
            cursor,
            name=payload.seller_responsible_name,
            person_type="VENDEDOR",
            actor=current_user,
        )
        cursor.execute(
            """
            INSERT INTO activations (
                motorcycle_model,
                chassis,
                order_date,
                seller,
                seller_responsible_id,
                mechanic_responsible_id,
                activation_date,
                activation_time,
                client_name,
                client_cpf,
                notes,
                mechanic_notes,
                status,
                created_at,
                updated_at,
                created_by,
                last_changed_by
            )
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.motorcycle_model,
                payload.chassis,
                payload.order_date.isoformat() if payload.order_date else None,
                seller_person["name"],
                seller_person["id"],
                activation_date.isoformat(),
                activation_time.isoformat(timespec="minutes"),
                payload.client_name,
                payload.client_cpf,
                payload.notes,
                payload.mechanic_notes,
                payload.status,
                now,
                now,
                current_user.username,
                current_user.username,
            ),
        )
        activation_id = cursor.lastrowid
        created = fetch_activation_or_404(cursor, activation_id)
        log_event(
            cursor,
            entity_type="activation",
            entity_id=activation_id,
            action="activation_created",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=seller_person["id"],
            mechanic_person_id=created["mechanic_responsible_id"],
            motorcycle_status=created["status"],
            new_value=activation_snapshot(created),
            details="Ativação criada.",
        )
    return row_to_activation(created, scheduling_message=schedule_preview.scheduling_message if schedule_preview else None)


def update_activation(activation_id: int, payload: ActivationUpdate, current_user: CurrentUser) -> ActivationResponse:
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo enviado para atualização.")

    with db_cursor(commit=True) as cursor:
        current = fetch_activation_or_404(cursor, activation_id)
        if current_user.profile == "VENDEDOR" and current["status"] == "Finalizado":
            raise HTTPException(status_code=400, detail="Ativações finalizadas não podem ser editadas.")

        old_snapshot = activation_snapshot(current)
        updates: list[str] = []
        values: list[Any] = []
        seller_person_id = current["seller_responsible_id"]
        scheduling_message: str | None = None
        current_order_date = date.fromisoformat(current["order_date"]) if current["order_date"] else None

        if "seller_responsible_name" in update_data:
            seller_person = ensure_person(
                cursor,
                name=update_data.pop("seller_responsible_name"),
                person_type="VENDEDOR",
                actor=current_user,
            )
            updates.extend(["seller = ?", "seller_responsible_id = ?"])
            values.extend([seller_person["name"], seller_person["id"]])
            seller_person_id = seller_person["id"]

        requested_order_date = update_data.get("order_date", current_order_date)
        order_date_changed = requested_order_date != current_order_date

        update_data.pop("activation_date", None)
        update_data.pop("activation_time", None)

        if order_date_changed:
            schedule_preview = calculate_activation_schedule(
                cursor,
                requested_order_date,
                exclude_activation_id=activation_id,
            )
            update_data["activation_date"] = schedule_preview.activation_date
            update_data["activation_time"] = schedule_preview.activation_time
            scheduling_message = schedule_preview.scheduling_message

        for key, value in update_data.items():
            if key == "order_date" and value is not None:
                value = value.isoformat()
            if key == "activation_date" and value is not None:
                value = value.isoformat()
            if key == "activation_time" and value is not None:
                value = value.isoformat(timespec="minutes")
            updates.append(f"{key} = ?")
            values.append(value)

        updates.extend(["updated_at = ?", "last_changed_by = ?"])
        values.extend([iso_now(), current_user.username, activation_id])
        cursor.execute(
            f"UPDATE activations SET {', '.join(updates)} WHERE id = ?",
            values,
        )
        updated = fetch_activation_or_404(cursor, activation_id)
        log_event(
            cursor,
            entity_type="activation",
            entity_id=activation_id,
            action="activation_updated",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=seller_person_id,
            mechanic_person_id=updated["mechanic_responsible_id"],
            motorcycle_status=updated["status"],
            old_value=old_snapshot,
            new_value=activation_snapshot(updated),
            details="Ativação atualizada.",
        )
    return row_to_activation(updated, scheduling_message=scheduling_message)


def cancel_activation(activation_id: int, current_user: CurrentUser) -> ActivationResponse:
    with db_cursor(commit=True) as cursor:
        current = fetch_activation_or_404(cursor, activation_id)
        if current["status"] == "Finalizado" and current_user.profile == "VENDEDOR":
            raise HTTPException(status_code=400, detail="Ativação finalizada não pode ser cancelada pelo vendedor.")

        old_snapshot = activation_snapshot(current)
        cursor.execute(
            """
            UPDATE activations
            SET status = 'Cancelado', updated_at = ?, last_changed_by = ?
            WHERE id = ?
            """,
            (iso_now(), current_user.username, activation_id),
        )
        updated = fetch_activation_or_404(cursor, activation_id)
        log_event(
            cursor,
            entity_type="activation",
            entity_id=activation_id,
            action="activation_cancelled",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=updated["seller_responsible_id"],
            mechanic_person_id=updated["mechanic_responsible_id"],
            motorcycle_status=updated["status"],
            old_value=old_snapshot,
            new_value=activation_snapshot(updated),
            details="Ativação cancelada.",
        )
    return row_to_activation(updated)


def delete_activation(activation_id: int, current_user: CurrentUser) -> None:
    with db_cursor(commit=True) as cursor:
        current = fetch_activation_or_404(cursor, activation_id)
        old_snapshot = activation_snapshot(current)
        cursor.execute(
            """
            UPDATE activations
            SET deleted_at = ?, deleted_by = ?, updated_at = ?, last_changed_by = ?
            WHERE id = ?
            """,
            (iso_now(), current_user.username, iso_now(), current_user.username, activation_id),
        )
        log_event(
            cursor,
            entity_type="activation",
            entity_id=activation_id,
            action="activation_deleted",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=current["seller_responsible_id"],
            mechanic_person_id=current["mechanic_responsible_id"],
            motorcycle_status=current["status"],
            old_value=old_snapshot,
            details="Registro removido logicamente.",
        )


def update_status(activation_id: int, payload: StatusUpdate, current_user: CurrentUser) -> ActivationResponse:
    with db_cursor(commit=True) as cursor:
        current = fetch_activation_or_404(cursor, activation_id)
        old_snapshot = activation_snapshot(current)

        mechanic_person_id = current["mechanic_responsible_id"]
        mechanic_name = payload.mechanic_responsible_name
        if payload.status in ("Em andamento", "Finalizado") and not mechanic_name:
            raise HTTPException(
                status_code=400,
                detail="Informe o mecânico responsável para iniciar ou finalizar o serviço.",
            )
        if mechanic_name:
            mechanic_person = ensure_person(
                cursor,
                name=mechanic_name,
                person_type="MECANICO",
                actor=current_user,
            )
            mechanic_person_id = mechanic_person["id"]

        cursor.execute(
            """
            UPDATE activations
            SET status = ?, mechanic_notes = ?, mechanic_responsible_id = ?, updated_at = ?, last_changed_by = ?
            WHERE id = ?
            """,
            (
                payload.status,
                payload.mechanic_notes,
                mechanic_person_id,
                iso_now(),
                current_user.username,
                activation_id,
            ),
        )
        updated = fetch_activation_or_404(cursor, activation_id)
        action = "service_finished" if payload.status == "Finalizado" else "status_changed"
        log_event(
            cursor,
            entity_type="activation",
            entity_id=activation_id,
            action=action,
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=updated["seller_responsible_id"],
            mechanic_person_id=updated["mechanic_responsible_id"],
            motorcycle_status=updated["status"],
            old_value=old_snapshot,
            new_value=activation_snapshot(updated),
            details="Status atualizado pela oficina." if current_user.profile == "OFICINA" else "Status atualizado.",
        )
    return row_to_activation(updated)


def update_mechanic_notes(
    activation_id: int,
    payload: MechanicNotesUpdate,
    current_user: CurrentUser,
) -> ActivationResponse:
    with db_cursor(commit=True) as cursor:
        current = fetch_activation_or_404(cursor, activation_id)
        old_snapshot = activation_snapshot(current)

        mechanic_person_id = current["mechanic_responsible_id"]
        mechanic_name = payload.mechanic_responsible_name
        if not mechanic_name and mechanic_person_id is None:
            raise HTTPException(
                status_code=400,
                detail="Informe o mecânico responsável para salvar a observação.",
            )
        if mechanic_name:
            mechanic_person = ensure_person(
                cursor,
                name=mechanic_name,
                person_type="MECANICO",
                actor=current_user,
            )
            mechanic_person_id = mechanic_person["id"]

        cursor.execute(
            """
            UPDATE activations
            SET mechanic_notes = ?, mechanic_responsible_id = ?, updated_at = ?, last_changed_by = ?
            WHERE id = ?
            """,
            (
                payload.mechanic_notes,
                mechanic_person_id,
                iso_now(),
                current_user.username,
                activation_id,
            ),
        )
        updated = fetch_activation_or_404(cursor, activation_id)
        log_event(
            cursor,
            entity_type="activation",
            entity_id=activation_id,
            action="mechanic_notes_updated",
            performed_by_user_id=current_user.id,
            performed_by_login=current_user.username,
            seller_person_id=updated["seller_responsible_id"],
            mechanic_person_id=updated["mechanic_responsible_id"],
            motorcycle_status=updated["status"],
            old_value=old_snapshot,
            new_value=activation_snapshot(updated),
            details="Observação da oficina atualizada.",
        )
    return row_to_activation(updated)


def get_history(activation_id: int) -> list[AuditLogResponse]:
    return list_audit_logs(entity_type="activation", entity_id=activation_id, limit=200)


def dashboard_for_date(target_date: date) -> DashboardResponse:
    activations = list_activations(activation_date=target_date.isoformat())
    now = datetime.now()
    delayed = [
        item
        for item in activations
        if item.status in ("Pendente", "Em andamento")
        and datetime.combine(item.activation_date, item.activation_time) < now
    ]
    upcoming = [
        item
        for item in activations
        if item.status in ("Pendente", "Em andamento")
        and 0 <= (datetime.combine(item.activation_date, item.activation_time) - now).total_seconds() <= 3600
    ]
    counts = {status_value: 0 for status_value in ALLOWED_STATUSES}
    for item in activations:
        counts[item.status] += 1
    return DashboardResponse(
        date=target_date,
        counts=counts,
        delayed=delayed,
        upcoming=upcoming,
        activations=activations,
    )


def export_activations_csv(**filters: Any) -> str:
    rows = list_activations(**filters)
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(
        [
            "ID",
            "Modelo",
            "Chassi",
            "Data Pedido",
            "Vendedor Responsavel",
            "Mecanico Responsavel",
            "Data Ativacao",
            "Horario",
            "Cliente",
            "CPF",
            "Status",
            "Observacoes Vendedor",
            "Observacoes Mecanico",
            "Criado Em",
            "Atualizado Em",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.id,
                row.motorcycle_model,
                row.chassis,
                row.order_date.isoformat() if row.order_date else "",
                row.seller_responsible_name,
                row.mechanic_responsible_name or "",
                row.activation_date.isoformat(),
                row.activation_time.strftime("%H:%M"),
                row.client_name,
                row.client_cpf,
                row.status,
                row.notes,
                row.mechanic_notes,
                row.created_at.isoformat(sep=" "),
                row.updated_at.isoformat(sep=" "),
            ]
        )
    return buffer.getvalue()
