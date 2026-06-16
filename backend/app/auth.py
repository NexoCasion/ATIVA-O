from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status

from .services.auth_service import get_user_by_session_token


@dataclass
class CurrentUser:
    id: int
    name: str
    username: str
    profile: str
    active: bool
    must_change_password: bool


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login para continuar.",
        )

    token = authorization.split(" ", 1)[1].strip()
    user = get_user_by_session_token(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    return CurrentUser(
        id=user["id"],
        name=user["name"],
        username=user["username"],
        profile=user["profile"],
        active=bool(user["active"]),
        must_change_password=bool(user["must_change_password"]),
    )


def require_roles(*allowed_roles: str):
    def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.profile not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seu perfil não tem permissão para esta ação.",
            )
        return current_user

    return dependency
