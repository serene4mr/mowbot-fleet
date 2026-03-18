import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Any

from vda5050.clients.master_control import MasterControlClient
from vda5050.models.state import State
from vda5050.models.instant_action import InstantActions
from vda5050.models.base import Action, BlockingType

# Assuming you migrated your AGVInfo and ErrorInfo to Pydantic models
from app.models.fleet import AGVInfo, ErrorInfo

logger = logging.getLogger("mowbot_mqtt")
logger.setLevel(logging.INFO)

# Global state dictionary: FastAPI will read this directly for WebSockets
fleet_state: Dict[str, AGVInfo] = {}

class MQTTService:
    def __init__(self):
        self._client: Optional[MasterControlClient] = None

    def _parse_sensor_status(self, info_description: str) -> Dict[str, str]:
        """
        Parse SENSOR_DIAG infoDescription string into dictionary.
        Example: "IMU:OK,Laser:OK,NTRIP:ERROR" -> {"IMU": "OK", "Laser": "OK", "NTRIP": "ERROR"}
        """
        if not info_description:
            return {}
        
        sensor_status = {}
        pairs = info_description.split(',')
        for pair in pairs:
            if ':' in pair:
                sensor, status = pair.split(':', 1)
                sensor_status[sensor.strip()] = status.strip()
        return sensor_status

    def _update_agv(self, serial: str, state: State):
        """
        Callback: Triggered natively by vda5050_client when a State message arrives.
        Updates the fleet_state dictionary in RAM.
        """
        info = fleet_state.get(serial)
        if not info:
            # Create a new AGV entry if it doesn't exist
            info = AGVInfo(
                serial=serial,
                manufacturer=state.manufacturer,
                last_update=datetime.now(timezone.utc)
            )
            fleet_state[serial] = info

        # Update core telemetry
        info.battery = state.batteryState.batteryCharge
        info.operating_mode = state.operatingMode.value
        
        # Map position: x = longitude, y = latitude
        if state.agvPosition:
            info.position = (state.agvPosition.x, state.agvPosition.y)
            info.theta = state.agvPosition.theta or 0.0
            
        info.last_update = datetime.now(timezone.utc)
        info.current_order = state.orderId
        
        # Map VDA5050 errors to our Pydantic model
        info.errors = [
            ErrorInfo(
                timestamp=datetime.now(timezone.utc).isoformat(),
                type=e.errorType,
                description=e.errorDescription,
                severity=e.errorLevel.value
            )
            for e in (getattr(state, 'errors', []) or [])
        ]
        
        # Parse Sensor Diagnostics from the information array
        info.sensor_status = None
        if state.information:
            for item in state.information:
                if item.infoType == "SENSOR_DIAG" and item.infoDescription:
                    info.sensor_status = self._parse_sensor_status(item.infoDescription)
                    break

    async def connect(self, host: str, port: int, user: str, password: str, use_tls: bool = False):
        """
        Initialize the MasterControlClient with correct positional arguments.
        """
        try:
            # Load general config for manufacturer and serial defaults
            from app.core.config import load_config
            config = load_config()
            gen_cfg = config.get("general", {})
            
            manufacturer = gen_cfg.get("manufacturer", "mowbot")
            serial_number = gen_cfg.get("serial_number", "fleet-master")
            client_id = f"fastapi_master_{uuid.uuid4().hex[:8]}"

            logger.info(f"Connecting to {host}:{port} as {client_id}")
            
            # --- FIX: Pass mandatory positional arguments first ---
            # Order: broker_url, manufacturer, serial_number
            self._client = MasterControlClient(
                host,             # broker_url
                manufacturer,     # manufacturer
                serial_number,    # serial_number
                broker_port=port,
                username=user if user else None,
                password=password if password else None,
                validate_messages=True
            )

            # Configure TLS for HiveMQ Cloud
            if use_tls or port == 8883:
                logger.info("Configuring TLS for secure HiveMQ connection...")
                # Ensure we access the internal paho-mqtt client correctly
                self._client.mqtt._client.tls_set() 
                self._client.mqtt._client.tls_insecure_set(False) 
                
            # Register callbacks
            self._client.on_state_update(self._update_agv)
            
            # Connect asynchronously
            await self._client.connect()
            logger.info("✅ Successfully connected to MQTT Broker")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MQTT: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self._client = None

    async def disconnect(self):
        """Gracefully disconnect from the MQTT broker."""
        if self._client:
            await self._client.disconnect()
            self._client = None
            logger.info("Disconnected from MQTT Broker")

    def is_connected(self) -> bool:
        """Check if the client is currently connected."""
        return self._client is not None and self._client.is_connected()

    async def send_instant_action(self, serial: str, action_type: str, blocking_type: str = "HARD", params: list = None) -> bool:
        """
        Constructs and sends a VDA5050 InstantAction message.
        """
        if not self.is_connected():
            logger.error("Cannot send action: Not connected to broker")
            return False
            
        agv = fleet_state.get(serial)
        if not agv:
            logger.error(f"Cannot send action: AGV {serial} not found in fleet_state")
            return False

        try:
            # Create the VDA5050 Action object
            action = Action(
                actionType=action_type,
                actionId=str(uuid.uuid4()),
                blockingType=BlockingType(blocking_type),
                actionParameters=params
            )
            
            # Wrap it in an InstantActions message
            instant_actions_msg = InstantActions(
                headerId=1, # Note: In production, track and increment this
                timestamp=datetime.now(timezone.utc),
                version="2.1.0",
                manufacturer=agv.manufacturer,
                serialNumber=serial,
                actions=[action]
            )
            
            # Publish using your library
            success = await self._client.publish_instant_actions(instant_actions_msg)
            
            if success:
                logger.info(f"✅ Sent instant action '{action_type}' to {serial}")
            else:
                logger.error(f"❌ Failed to send instant action '{action_type}' to {serial}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending instant action to {serial}: {e}")
            return False

# Export a singleton instance to be used by FastAPI routers
mqtt_service = MQTTService()