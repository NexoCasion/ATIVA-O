from __future__ import annotations

import argparse
from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import init_db
from backend.app.auth import CurrentUser
from backend.app.services.import_service import import_excel


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa ativacoes a partir de uma planilha Excel .xlsx")
    parser.add_argument("file", help="Caminho do arquivo .xlsx")
    parser.add_argument("--changed-by", required=True, help="Nome de quem esta executando a importacao")
    args = parser.parse_args()

    init_db()
    file_path = Path(args.file)
    current_user = CurrentUser(
        id=0,
        name=args.changed_by,
        username=args.changed_by,
        profile="ADMIN",
        active=True,
        must_change_password=False,
    )
    result = import_excel(file_path.read_bytes(), current_user)
    print(f"Importadas: {result.imported}")
    print(f"Linhas vazias ignoradas: {result.ignored_blank_rows}")
    if result.errors:
        print("Erros:")
        for error in result.errors:
            print(f"- {error}")


if __name__ == "__main__":
    main()
