"""Utility helpers for loading configuration for the ascripts helpers."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict


_CONFIG_CACHE: Dict[str, Any] | None = None


def _default_config_path() -> Path:
    cfg_env = os.getenv("SD_CONFIG_PATH")
    if cfg_env:
        return Path(cfg_env).expanduser()
    return Path(__file__).with_name("config.json")


def load_config() -> Dict[str, Any]:
    """Load configuration from JSON file (with basic caching).

    Missing file returns an empty dict. Invalid JSON also returns empty dict
    but logs a brief warning to stderr.
    """

    global _CONFIG_CACHE
    if _CONFIG_CACHE is not None:
        return _CONFIG_CACHE

    path = _default_config_path()
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict):
            _CONFIG_CACHE = data
        else:
            print(f"[warn] Config file {path} is not a JSON object; ignoring.")
            _CONFIG_CACHE = {}
    except FileNotFoundError:
        _CONFIG_CACHE = {}
    except Exception as exc:
        print(f"[warn] Failed to read config file {path}: {exc}")
        _CONFIG_CACHE = {}
    return _CONFIG_CACHE


def config_value(key: str, default: Any = None) -> Any:
    """Helper to fetch a config value after loading the JSON."""

    return load_config().get(key, default)

