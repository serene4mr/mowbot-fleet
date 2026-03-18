from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.mission import MissionRouteCreate, MissionRouteOut
from app.services.mission_service import (
    create_route,
    delete_route,
    get_route,
    list_routes,
)

router = APIRouter(prefix="/api/missions", tags=["missions"])


def _to_out(r: dict) -> MissionRouteOut:
    return MissionRouteOut(
        id=r["id"],
        name=r["name"],
        description=r.get("description", ""),
        waypoints=r["waypoints"],
        created_by=r["created_by"],
        created_at=r["created_at"],
        updated_at=r["updated_at"],
    )


@router.get("/routes", response_model=List[MissionRouteOut])
async def list_mission_routes(current_user: dict = Depends(get_current_user)):
    return [_to_out(r) for r in list_routes()]


@router.post("/routes", response_model=MissionRouteOut, status_code=201)
async def create_mission_route(
    body: MissionRouteCreate, current_user: dict = Depends(get_current_user)
):
    route = create_route(
        name=body.name,
        description=body.description or "",
        waypoints=body.waypoints,
        created_by=current_user["username"],
    )
    if not route:
        raise HTTPException(
            status_code=400, detail="Route name already exists or invalid data"
        )
    return _to_out(route)


@router.get("/routes/{route_id}", response_model=MissionRouteOut)
async def get_mission_route(
    route_id: int, _user: dict = Depends(get_current_user)
):
    route = get_route(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return _to_out(route)


@router.delete("/routes/{route_id}", status_code=204)
async def delete_mission_route(
    route_id: int, _user: dict = Depends(get_current_user)
):
    ok = delete_route(route_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Route not found")
