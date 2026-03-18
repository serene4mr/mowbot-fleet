import os
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from contextlib import asynccontextmanager

# Import our MQTT singleton and the shared fleet state
from app.services.mqtt_service import mqtt_service, fleet_state
from app.core.config import load_config # Assuming you ported your config loader

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mowbot_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles the startup and shutdown of the backend.
    Replaces the manual thread management from the Streamlit version.
    """
    # Load configuration
    config = load_config()
    broker_cfg = config.get("broker", {})
    
    # Priority: Environment Variables -> Config Files
    host = os.getenv("BROKER_HOST", broker_cfg.get("host", "localhost"))
    port = int(os.getenv("BROKER_PORT", broker_cfg.get("port", 1883)))
    user = os.getenv("BROKER_USER", broker_cfg.get("user", ""))
    password = os.getenv("BROKER_PASSWORD", broker_cfg.get("password", ""))
    use_tls = os.getenv("BROKER_TLS", str(broker_cfg.get("use_tls", "false"))).lower() == "true"

    logger.info(f"🚀 Starting Backend. Connecting to MQTT at {host}:{port}...")
    
    # Connect the MQTT service natively in the FastAPI event loop
    await mqtt_service.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        use_tls=use_tls
    )
    
    yield # Server is now running
    
    # Cleanup on shutdown
    logger.info("🛑 Shutting down. Disconnecting MQTT...")
    await mqtt_service.disconnect()

app = FastAPI(
    title="Mowbot Fleet API",
    version="2.0.0",
    lifespan=lifespan
)

# --- REST API Endpoints ---

@app.get("/api/health")
async def health_check():
    """Verify system status."""
    return {
        "status": "online",
        "mqtt_connected": mqtt_service.is_connected(),
        "agv_count": len(fleet_state)
    }

@app.post("/api/fleet/{serial}/emergency-stop")
async def emergency_stop(serial: str):
    """
    Triggers a HARD emergency stop via VDA5050 InstantAction.
    """
    success = await mqtt_service.send_instant_action(
        serial=serial, 
        action_type="emergencyStop", 
        blocking_type="HARD"
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to send E-STOP. Is AGV online?")
    return {"message": f"E-STOP sent to {serial}"}

# --- WebSocket Telemetry Stream ---

@app.websocket("/ws/fleet")
async def fleet_telemetry(websocket: WebSocket):
    """
    Continuous stream of AGV positions and states to the React Frontend.
    """
    await websocket.accept()
    logger.info("💻 Frontend connected to WebSocket")
    try:
        while True:
            # FIX: Use mode='json' to handle datetime serialization
            data = {
                serial: info.model_dump(mode='json') 
                for serial, info in fleet_state.items()
            }
            
            # Send the serialized data
            await websocket.send_json(data)
            
            # 10Hz update rate
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        logger.info("💻 Frontend disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")