from app.db.database import get_db, USERS_DB, SECURE_CONFIG_DB, MISSIONS_DB


def init_users_table() -> None:
    with get_db(USERS_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                hashed_password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def init_secure_config_table() -> None:
    with get_db(SECURE_CONFIG_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS secure_config (
                config_key TEXT PRIMARY KEY,
                encrypted_value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def init_missions_table() -> None:
    with get_db(MISSIONS_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS mission_routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                waypoints TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def init_all() -> None:
    init_users_table()
    init_secure_config_table()
    init_missions_table()
