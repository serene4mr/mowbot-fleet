from pydantic import BaseModel
from typing import List, Optional, Tuple
from datetime import datetime

Waypoint = Tuple[float, float]  # (longitude, latitude)


class MissionRouteCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    waypoints: List[Waypoint]


class MissionRouteOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    waypoints: List[Waypoint]
    created_by: str
    created_at: datetime
    updated_at: datetime


class DispatchOrderRequest(BaseModel):
    waypoints: List[Waypoint]
