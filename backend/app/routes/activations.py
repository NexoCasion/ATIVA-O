from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status as http_status
from fastapi.responses import PlainTextResponse

from ..auth import CurrentUser, get_current_user, require_roles
from ..schemas import (
    ActivationCreate,
    ActivationResponse,
    ActivationUpdate,
    AuditLogResponse,
    DashboardResponse,
    SchedulePreviewResponse,
    StatusUpdate,
)
from ..services.activation_service import (
    cancel_activation,
    create_activation,
    dashboard_for_date,
    delete_activation,
    export_activations_csv,
    get_activation,
    get_history,
    list_activations,
    preview_activation_schedule,
    update_activation,
    update_status,
)
router = APIRouter()


@router.get("/activations", response_model=list[ActivationResponse])
def list_activations_endpoint(
    activation_date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    seller: str | None = None,
    mechanic: str | None = None,
    seller_person_id: int | None = None,
    mechanic_person_id: int | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    chassis: str | None = None,
    client: str | None = None,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR", "OFICINA")),
) -> list[ActivationResponse]:
    return list_activations(
        activation_date=activation_date,
        start_date=start_date,
        end_date=end_date,
        seller=seller,
        mechanic=mechanic,
        seller_person_id=seller_person_id,
        mechanic_person_id=mechanic_person_id,
        status_value=status_value,
        chassis=chassis,
        client=client,
    )


@router.get("/activations/schedule-preview", response_model=SchedulePreviewResponse)
def schedule_preview_endpoint(
    order_date: date | None = None,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR")),
) -> SchedulePreviewResponse:
    return preview_activation_schedule(order_date)


@router.get("/activations/{activation_id}", response_model=ActivationResponse)
def get_activation_endpoint(
    activation_id: int,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR", "OFICINA")),
) -> ActivationResponse:
    return get_activation(activation_id)


@router.post("/activations", response_model=ActivationResponse, status_code=http_status.HTTP_201_CREATED)
def create_activation_endpoint(
    payload: ActivationCreate,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR")),
) -> ActivationResponse:
    return create_activation(payload, current_user)


@router.put("/activations/{activation_id}", response_model=ActivationResponse)
def update_activation_endpoint(
    activation_id: int,
    payload: ActivationUpdate,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR")),
) -> ActivationResponse:
    return update_activation(activation_id, payload, current_user)


@router.post("/activations/{activation_id}/cancel", response_model=ActivationResponse)
def cancel_activation_endpoint(
    activation_id: int,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR")),
) -> ActivationResponse:
    return cancel_activation(activation_id, current_user)


@router.patch("/activations/{activation_id}/status", response_model=ActivationResponse)
@router.put("/activations/{activation_id}/status", response_model=ActivationResponse)
def update_status_endpoint(
    activation_id: int,
    payload: StatusUpdate,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "OFICINA")),
) -> ActivationResponse:
    return update_status(activation_id, payload, current_user)


@router.delete("/activations/{activation_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_activation_endpoint(
    activation_id: int,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> Response:
    delete_activation(activation_id, current_user)
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)


@router.get("/activations/{activation_id}/history", response_model=list[AuditLogResponse])
def history_endpoint(
    activation_id: int,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> list[AuditLogResponse]:
    return get_history(activation_id)


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard_endpoint(
    target_date: date | None = None,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> DashboardResponse:
    return dashboard_for_date(target_date or date.today())


@router.get("/export", response_class=PlainTextResponse)
def export_endpoint(
    activation_date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    seller: str | None = None,
    mechanic: str | None = None,
    seller_person_id: int | None = None,
    mechanic_person_id: int | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    chassis: str | None = None,
    client: str | None = None,
    current_user: CurrentUser = Depends(require_roles("ADMIN")),
) -> PlainTextResponse:
    csv_content = export_activations_csv(
        activation_date=activation_date,
        start_date=start_date,
        end_date=end_date,
        seller=seller,
        mechanic=mechanic,
        seller_person_id=seller_person_id,
        mechanic_person_id=mechanic_person_id,
        status_value=status_value,
        chassis=chassis,
        client=client,
    )
    headers = {"Content-Disposition": 'attachment; filename="relatorio-ativacoes.csv"'}
    return PlainTextResponse(csv_content, headers=headers, media_type="text/csv; charset=utf-8")
