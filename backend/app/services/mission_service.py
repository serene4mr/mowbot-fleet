import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.db.database import get_db, MISSIONS_DB

logger = logging.getLogger("mowbot_missions")


def list_routes() -> List[Dict[str, Any]]:
    with get_db(MISSIONS_DB) as conn:
        rows = conn.execute(
            """
            SELECT id, name, description, waypoints, created_by, created_at, updated_at
            FROM mission_routes ORDER BY updated_at DESC
            """
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_route(route_id: int) -> Optional[Dict[str, Any]]:
    with get_db(MISSIONS_DB) as conn:
        row = conn.execute(
            """
            SELECT id, name, description, waypoints, created_by, created_at, updated_at
            FROM mission_routes WHERE id = ?
            """,
            (route_id,),
        ).fetchone()
        return _row_to_dict(row) if row else None


def create_route(
    name: str,
    description: str,
    waypoints: List[Tuple[float, float]],
    created_by: str,
) -> Optional[Dict[str, Any]]:
    try:
        with get_db(MISSIONS_DB) as conn:
            cursor = conn.execute(
                """
                INSERT INTO mission_routes (name, description, waypoints, created_by)
                VALUES (?, ?, ?, ?)
                """,
                (name.strip(), description or "", json.dumps(waypoints), created_by),
            )
            return get_route(cursor.lastrowid)
    except Exception as e:
        logger.error(f"Failed to create route '{name}': {e}")
        return None


def delete_route(route_id: int) -> bool:
    with get_db(MISSIONS_DB) as conn:
        cursor = conn.execute(
            "DELETE FROM mission_routes WHERE id = ?", (route_id,)
        )
        return cursor.rowcount > 0


def _row_to_dict(row) -> Dict[str, Any]:
    d = dict(row)
    d["waypoints"] = json.loads(d["waypoints"])
    return d
