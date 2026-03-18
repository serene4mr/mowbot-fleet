from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Tuple, Dict
import time

class ErrorInfo(BaseModel):
    timestamp: datetime
    type: str
    description: str
    severity: str # "WARNING" or "FATAL"

class AGVInfo(BaseModel):
    serial: str
    manufacturer: str
    connection: str = "OFFLINE"
    battery: float = 0.0
    operating_mode: str = ""
    # Store as (longitude, latitude)
    position: Tuple[float, float] = (0.0, 0.0) 
    theta: float = 0.0
    last_update: datetime = Field(default_factory=datetime.utcnow)
    connect_timestamp: float = Field(default_factory=time.time)
    current_order: Optional[str] = None
    errors: List[ErrorInfo] = []
    # e.g., {"IMU": "OK", "Laser": "WARN"}
    sensor_status: Optional[Dict[str, str]] = None