import logging
from typing import Optional

from app.db.database import get_db, USERS_DB
from app.core.security import hash_password, verify_password

logger = logging.getLogger("mowbot_auth")

DEFAULT_ADMIN_USER = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"


def ensure_default_admin() -> None:
    with get_db(USERS_DB) as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE username = ?", (DEFAULT_ADMIN_USER,)
        ).fetchone()
        if not row:
            hashed = hash_password(DEFAULT_ADMIN_PASSWORD)
            conn.execute(
                "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
                (DEFAULT_ADMIN_USER, hashed),
            )
            logger.info(
                f"Created default admin user '{DEFAULT_ADMIN_USER}' — "
                "change password after first login."
            )


def get_user_by_username(username: str) -> Optional[dict]:
    with get_db(USERS_DB) as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        return dict(row) if row else None


def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = get_user_by_username(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user
