from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import CurrentUser, require_roles
from ..schemas import PersonCreate, PersonResponse
from ..services.people_service import create_person, list_people

router = APIRouter()


@router.get("/people", response_model=list[PersonResponse])
def list_people_endpoint(
    person_type: str | None = Query(default=None, alias="type"),
    search: str | None = None,
    include_inactive: bool = False,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR", "OFICINA")),
) -> list[PersonResponse]:
    if current_user.profile == "VENDEDOR":
        person_type = "VENDEDOR"
    if current_user.profile == "OFICINA":
        person_type = "MECANICO"
    return list_people(person_type=person_type, search=search, include_inactive=include_inactive and current_user.profile == "ADMIN")


@router.post("/people", response_model=PersonResponse)
def create_people_endpoint(
    payload: PersonCreate,
    current_user: CurrentUser = Depends(require_roles("ADMIN", "VENDEDOR", "OFICINA")),
) -> PersonResponse:
    if current_user.profile == "VENDEDOR" and payload.type != "VENDEDOR":
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Vendedor só pode cadastrar vendedor responsável.")
    if current_user.profile == "OFICINA" and payload.type != "MECANICO":
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Oficina só pode cadastrar mecânico responsável.")
    return create_person(payload, current_user)
