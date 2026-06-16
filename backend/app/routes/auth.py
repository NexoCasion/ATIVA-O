from __future__ import annotations

from fastapi import APIRouter, Depends, Header

from ..auth import CurrentUser, get_current_user
from ..schemas import LoginRequest, LoginResponse, UserResponse
from ..services.auth_service import login, logout

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
def login_endpoint(payload: LoginRequest) -> LoginResponse:
    return login(payload)


@router.get("/auth/me", response_model=UserResponse)
def me_endpoint(current_user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    from ..services.auth_service import row_to_user
    from ..database import db_cursor

    with db_cursor() as cursor:
        row = cursor.execute("SELECT * FROM users WHERE id = ?", (current_user.id,)).fetchone()
    return row_to_user(row)


@router.post("/auth/logout")
def logout_endpoint(
    authorization: str | None = Header(default=None),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, str]:
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token:
        logout(token, current_user.username)
    return {"status": "ok"}
