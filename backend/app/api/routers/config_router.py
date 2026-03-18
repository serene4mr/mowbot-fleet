import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.broker_config_service import get_broker_config, save_broker_config
from app.services.mqtt_service import mqtt_service

logger = logging.getLogger("mowbot_config_router")

router = APIRouter(prefix="/api", tags=["config"])


class BrokerConfigIn(BaseModel):
    host: str
    port: int
    use_tls: bool = False
    user: Optional[str] = ""
    password: Optional[str] = ""


class BrokerConfigOut(BaseModel):
    host: str
    port: int
    use_tls: bool
    user: str
    password_set: bool


@router.get("/config/broker", response_model=BrokerConfigOut)
async def get_broker(_user: dict = Depends(get_current_user)):
    config = get_broker_config()
    return BrokerConfigOut(
        host=config.get("host", "localhost"),
        port=config.get("port", 1883),
        use_tls=config.get("use_tls", False),
        user=config.get("user", ""),
        password_set=bool(config.get("password", "")),
    )


@router.post("/config/broker")
async def save_broker(body: BrokerConfigIn, _user: dict = Depends(get_current_user)):
    config = {
        "host": body.host,
        "port": body.port,
        "use_tls": body.use_tls,
        "user": body.user or "",
        "password": body.password or "",
    }
    ok = save_broker_config(config)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save broker config")
    return {"message": "Broker configuration saved"}


@router.post("/broker/reconnect")
async def reconnect_broker(_user: dict = Depends(get_current_user)):
    config = get_broker_config()
    try:
        await mqtt_service.disconnect()
        await mqtt_service.connect(
            host=config.get("host", "localhost"),
            port=config.get("port", 1883),
            user=config.get("user", ""),
            password=config.get("password", ""),
            use_tls=config.get("use_tls", False),
        )
        return {
            "message": "Reconnected to broker",
            "mqtt_connected": mqtt_service.is_connected(),
        }
    except Exception as e:
        logger.error(f"Reconnect failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reconnect failed: {e}")
