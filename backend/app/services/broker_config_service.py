import base64
import json
import logging
from typing import Any, Dict, Optional

from app.db.database import get_db, SECURE_CONFIG_DB

logger = logging.getLogger("mowbot_broker_config")

try:
    from cryptography.fernet import Fernet
    _CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    _CRYPTOGRAPHY_AVAILABLE = False

_cipher = None


def _get_cipher() -> Optional[Any]:
    global _cipher
    if _cipher is not None:
        return _cipher
    if not _CRYPTOGRAPHY_AVAILABLE:
        return None
    from pathlib import Path
    key_file = Path("data/encryption.key")
    if key_file.exists():
        key = key_file.read_bytes()
    else:
        key = Fernet.generate_key()
        key_file.parent.mkdir(parents=True, exist_ok=True)
        key_file.write_bytes(key)
        key_file.chmod(0o600)
    _cipher = Fernet(key)
    return _cipher


def _encrypt(value: str) -> str:
    cipher = _get_cipher()
    if cipher:
        return base64.b64encode(cipher.encrypt(value.encode())).decode()
    return base64.b64encode(value.encode()).decode()


def _decrypt(encrypted: str) -> str:
    cipher = _get_cipher()
    if cipher:
        return cipher.decrypt(base64.b64decode(encrypted.encode())).decode()
    return base64.b64decode(encrypted.encode()).decode()


_DEFAULT_CONFIG: Dict[str, Any] = {
    "host": "localhost",
    "port": 1883,
    "use_tls": False,
    "user": "",
    "password": "",
}


def get_broker_config() -> Dict[str, Any]:
    with get_db(SECURE_CONFIG_DB) as conn:
        row = conn.execute(
            "SELECT encrypted_value FROM secure_config WHERE config_key = 'broker'"
        ).fetchone()
        if row:
            try:
                return json.loads(_decrypt(row["encrypted_value"]))
            except Exception as e:
                logger.error(f"Failed to decrypt broker config: {e}")
        return dict(_DEFAULT_CONFIG)


def save_broker_config(config: Dict[str, Any]) -> bool:
    try:
        encrypted = _encrypt(json.dumps(config))
        with get_db(SECURE_CONFIG_DB) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO secure_config (config_key, encrypted_value, updated_at)
                VALUES ('broker', ?, CURRENT_TIMESTAMP)
                """,
                (encrypted,),
            )
        return True
    except Exception as e:
        logger.error(f"Failed to save broker config: {e}")
        return False
