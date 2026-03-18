from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.mqtt_service import fleet_state, mqtt_service

router = APIRouter(prefix="/api", tags=["fleet"])


class InstantActionRequest(BaseModel):
    action_type: str
    blocking_type: str = "HARD"
    params: Optional[list] = None


class DispatchOrderRequest(BaseModel):
    waypoints: List[Tuple[float, float]]


@router.get("/health")
async def health_check():
    return {
        "status": "online",
        "mqtt_connected": mqtt_service.is_connected(),
        "agv_count": len(fleet_state),
    }


@router.post("/fleet/{serial}/emergency-stop")
async def emergency_stop(serial: str, _user: dict = Depends(get_current_user)):
    success = await mqtt_service.send_instant_action(
        serial=serial, action_type="emergencyStop", blocking_type="HARD"
    )
    if not success:
        raise HTTPException(
            status_code=400, detail="Failed to send E-STOP. Is AGV online?"
        )
    return {"message": f"E-STOP sent to {serial}"}


@router.post("/fleet/{serial}/instant-action")
async def instant_action(
    serial: str,
    body: InstantActionRequest,
    _user: dict = Depends(get_current_user),
):
    success = await mqtt_service.send_instant_action(
        serial=serial,
        action_type=body.action_type,
        blocking_type=body.blocking_type,
        params=body.params,
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send '{body.action_type}' to {serial}",
        )
    return {"message": f"Action '{body.action_type}' sent to {serial}"}


@router.post("/fleet/{serial}/order")
async def dispatch_order(
    serial: str,
    body: DispatchOrderRequest,
    _user: dict = Depends(get_current_user),
):
    if not mqtt_service.is_connected():
        raise HTTPException(status_code=503, detail="MQTT not connected")
    agv = fleet_state.get(serial)
    if not agv:
        raise HTTPException(status_code=404, detail=f"AGV '{serial}' not in fleet")
    if len(body.waypoints) < 2:
        raise HTTPException(status_code=400, detail="At least 2 waypoints required")
    success = await mqtt_service.send_order(serial=serial, waypoints=body.waypoints)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to dispatch order")
    return {
        "message": f"Order dispatched to {serial}",
        "waypoint_count": len(body.waypoints),
    }
