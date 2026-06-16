from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import API_PREFIX, FRONTEND_DIR
from .database import init_db
from .routes.activations import router as activations_router
from .routes.admin import router as admin_router
from .routes.auth import router as auth_router
from .routes.people import router as people_router

app = FastAPI(
    title="Sistema de Ativação de Motos",
    version="2.0.0",
    description="Sistema interno com login, permissões e gestão de ativações de motos.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get(f"{API_PREFIX}/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router, prefix=API_PREFIX, tags=["auth"])
app.include_router(people_router, prefix=API_PREFIX, tags=["people"])
app.include_router(admin_router, prefix=API_PREFIX, tags=["admin"])
app.include_router(activations_router, prefix=API_PREFIX, tags=["activations"])


def serve_frontend_file(path: str = "") -> FileResponse:
    file_path = (Path(FRONTEND_DIR) / path).resolve()
    frontend_root = Path(FRONTEND_DIR).resolve()
    if file_path.is_file() and frontend_root in file_path.parents:
        return FileResponse(file_path)
    return FileResponse(frontend_root / "index.html")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return serve_frontend_file()


@app.get("/{full_path:path}", include_in_schema=False)
def spa_router(full_path: str) -> FileResponse:
    return serve_frontend_file(full_path)
