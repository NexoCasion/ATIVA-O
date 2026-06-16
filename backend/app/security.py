from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta


PASSWORD_ITERATIONS = 120_000
SESSION_HOURS = 12


def iso_now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        _, iterations_text, salt, expected_hash = stored_hash.split("$", 3)
    except ValueError:
        return False

    computed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations_text),
    ).hex()
    return hmac.compare_digest(computed, expected_hash)


def generate_session_token() -> str:
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def session_expiration_iso() -> str:
    return (datetime.now() + timedelta(hours=SESSION_HOURS)).isoformat(timespec="seconds")
