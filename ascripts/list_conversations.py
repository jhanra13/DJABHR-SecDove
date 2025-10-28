#!/usr/bin/env python3
"""
List conversations for a SecureDove user, including key numbers,
participants, and timestamps.

You can authenticate either with an existing bearer token or by
supplying username/password (the script will call /auth/login).

Configuration defaults are read from ascripts/config.json. Environment
variables (SD_BASE_URL, SD_TOKEN, SD_USERNAME, SD_PASSWORD) override the
file when set.

Usage examples:
  # Using token
  export SD_TOKEN='eyJ...'
  python3 ascripts/list_conversations.py

  # Using credentials
  export SD_USERNAME='tester'
  export SD_PASSWORD='P@ssw0rd!'
  python3 ascripts/list_conversations.py
"""

from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from urllib import request, error

from config_loader import config_value


def _cfg_str(cfg_key: str, env_name: str, default: str) -> str:
    val = os.getenv(env_name)
    if val is not None and val != "":
        return val
    cfg_val = config_value(cfg_key)
    if cfg_val is None or cfg_val == "":
        return default
    return str(cfg_val)


BASE_URL = _cfg_str("base_url", "SD_BASE_URL", "http://localhost:8000")
API_BASE = f"{BASE_URL.rstrip('/')}/api"

TOKEN = os.getenv("SD_TOKEN") or _cfg_str("token", "SD_TOKEN", "") or None
USERNAME = os.getenv("SD_USERNAME") or _cfg_str("username", "SD_USERNAME", "") or None
PASSWORD = os.getenv("SD_PASSWORD") or _cfg_str("password", "SD_PASSWORD", "") or None


def _http_json(method: str, url: str, body: dict | None = None, token: str | None = None) -> dict:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = request.Request(url=url, method=method.upper(), data=data)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with request.urlopen(req, timeout=20) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {}
    except error.HTTPError as e:
        try:
            payload = e.read().decode("utf-8")
            data = json.loads(payload) if payload else {}
        except Exception:
            data = {"error": e.reason}
        raise RuntimeError(f"HTTP {e.code} {e.reason}: {data}") from None
    except error.URLError as e:
        raise RuntimeError(f"Request failed: {e}") from None


def _login(username: str, password: str) -> tuple[str, dict]:
    url = f"{API_BASE}/auth/login"
    resp = _http_json("POST", url, {"username": username, "password": password})
    token = resp.get("token")
    if not token:
        raise RuntimeError("Login succeeded but no token returned")
    return token, resp.get("user", {})


def _get_conversations(token: str) -> list[dict]:
    url = f"{API_BASE}/conversations"
    resp = _http_json("GET", url, None, token)
    return resp.get("conversations", [])


def _ts(ms: int | None) -> str:
    if not ms:
        return "-"
    try:
        return datetime.fromtimestamp(ms / 1000).isoformat()
    except Exception:
        return str(ms)


def main() -> int:
    print("== SecureDove ascripts/list_conversations.py ==")
    print(f"Base URL: {BASE_URL}")

    token = TOKEN
    user_info = {}

    if not token:
        if not (USERNAME and PASSWORD):
            print("Error: set SD_TOKEN or SD_USERNAME+SD_PASSWORD", file=sys.stderr)
            return 2
        try:
            token, user_info = _login(USERNAME, PASSWORD)
            print(f"Logged in as {user_info.get('username')} (id={user_info.get('id')})")
        except Exception as e:
            print(f"Login failed: {e}", file=sys.stderr)
            return 1
    else:
        print("Using bearer token from SD_TOKEN")

    try:
        conversations = _get_conversations(token)
    except Exception as e:
        print(f"Failed to fetch conversations: {e}", file=sys.stderr)
        return 1

    if not conversations:
        print("No conversations found.")
        return 0

    print()
    for convo in conversations:
        cid = convo.get('id')
        key_num = convo.get('content_key_number')
        participants = convo.get('participants') or []
        created_at = _ts(convo.get('created_at'))
        latest_key_entries = []
        keys = convo.get('keys') or []
        for k in keys:
            num = k.get('content_key_number')
            created = _ts(k.get('created_at'))
            latest_key_entries.append(f"#{num} at {created}")

        print(f"Conversation ID: {cid}")
        print(f"  Latest key #: {key_num}")
        if latest_key_entries:
            print("  Key history:")
            for entry in latest_key_entries:
                print(f"    - {entry}")
        else:
            print("  Key history: (none)")
        print(f"  Participants: {', '.join(participants) or '(none)'}")
        print(f"  Created At: {created_at}")
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
