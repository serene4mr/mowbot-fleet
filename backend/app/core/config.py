import os
import yaml
from typing import Any, Dict

def deep_merge(base: Dict[Any, Any], override: Dict[Any, Any]) -> Dict[Any, Any]:
    """Recursively merges override dict into base."""
    for key, value in override.items():
        if isinstance(value, dict) and key in base and isinstance(base[key], dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base

def load_config() -> Dict[str, Any]:
    """
    Loads and merges all three config layers:
    1. config_default.yaml (Committed defaults)
    2. config_local.yaml (User overrides)
    3. Environment variables (Highest priority)
    """
    # Define paths relative to the backend root
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    default_path = os.path.join(base_dir, "config", "config_default.yaml")
    local_path = os.path.join(base_dir, "config", "config_local.yaml")

    # 1. Load Defaults
    if not os.path.exists(default_path):
        # Create a basic default dict if the file is missing
        config = {
            "general": {"manufacturer": "mowbot", "serial_number": "default"},
            "broker": {"host": "localhost", "port": 1883, "use_tls": False}
        }
    else:
        with open(default_path, "r") as f:
            config = yaml.safe_load(f) or {}

    # 2. Merge Local Overrides
    if os.path.exists(local_path):
        with open(local_path, "r") as f:
            local_config = yaml.safe_load(f) or {}
            config = deep_merge(config, local_config)

    return config