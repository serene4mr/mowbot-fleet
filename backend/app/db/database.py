import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

USERS_DB = DATA_DIR / "users.db"
SECURE_CONFIG_DB = DATA_DIR / "secure_config.db"
MISSIONS_DB = DATA_DIR / "mission_routes.db"


@contextmanager
def get_db(db_path: Path):
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
