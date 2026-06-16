from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
DATABASE_PATH = ROOT_DIR / "data" / "activations.db"
SCHEMA_PATH = ROOT_DIR / "database" / "schema.sql"
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKUP_DIR = ROOT_DIR / "backups"
API_PREFIX = "/api"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 1234
DEFAULT_PUBLIC_URL = "http://localhost:1234"
