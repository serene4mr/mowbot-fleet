import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.db.models import init_all
from app.services.auth_service import ensure_default_admin
from app.services.broker_config_service import get_broker_config
from app.services.mqtt_service import fleet_state, mqtt_service
from app.core.config import load_config
from app.api.routers.auth import router as auth_router
from app.api.routers.fleet import router as fleet_router
from app.api.routers.config_router import router as config_router
from app.api.routers.missions import router as missions_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mowbot_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise database tables and default admin user
    init_all()
    ensure_default_admin()

    # Determine broker config: secure DB → YAML config → environment variables
    stored = get_broker_config()
    yaml_cfg = load_config().get("broker", {})

    host = os.getenv("BROKER_HOST", stored.get("host") or yaml_cfg.get("host", "localhost"))
    port = int(os.getenv("BROKER_PORT", stored.get("port") or yaml_cfg.get("port", 1883)))
    user = os.getenv("BROKER_USER", stored.get("user") or yaml_cfg.get("user", ""))
    password = os.getenv("BROKER_PASSWORD", stored.get("password") or yaml_cfg.get("password", ""))
    use_tls_env = os.getenv("BROKER_TLS")
    if use_tls_env is not None:
        use_tls = use_tls_env.lower() == "true"
    else:
        use_tls = stored.get("use_tls") or yaml_cfg.get("use_tls", False)

    logger.info(f"Starting backend — connecting to MQTT at {host}:{port}")
    await mqtt_service.connect(host=host, port=port, user=user, password=password, use_tls=use_tls)

    yield

    logger.info("Shutting down — disconnecting MQTT")
    await mqtt_service.disconnect()


app = FastAPI(title="Mowbot Fleet API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(fleet_router)
app.include_router(config_router)
app.include_router(missions_router)


# WebSocket telemetry stream — no auth required so the browser can connect directly
@app.websocket("/ws/fleet")
async def fleet_telemetry(websocket: WebSocket):
    await websocket.accept()
    logger.info("Frontend connected to WebSocket")
    try:
        while True:
            data = {
                serial: info.model_dump(mode="json")
                for serial, info in fleet_state.items()
            }
            await websocket.send_json(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        logger.info("Frontend disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
