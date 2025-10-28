#!/usr/bin/env python3
"""
Send a SecureDove message using username/password credentials, encrypting
the raw contents of a file (no JSON parsing of the plaintext).

Notes
- This does NOT bypass server limits; the request body must still be under
  the server's configured JSON limit (default ~10 MB). If you need to send
  larger data, consider chunking into multiple messages.
- Requires the `cryptography` package so we can unwrap the conversation AES
  content key and produce AES‑GCM ciphertext (IV + ciphertext) as hex.

Configuration
- Defaults come from ascripts/config.json. Environment variables override
  when set:
  - SD_BASE_URL, SD_USERNAME, SD_PASSWORD
  - SD_CONVERSATION_ID, SD_KEY_NUM
  - SD_CONTENT_KEY_HEX (optional direct AES key override)
  - SD_MESSAGE_BLOB (path to input file; defaults to ascripts/message_blob.bin)

Usage
  python3 ascripts/send_message_from_blob.py
"""

from __future__ import annotations
import json
import os
import sys
from pathlib import Path
from urllib import request, error
import hashlib
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore
    from cryptography.hazmat.primitives.asymmetric import padding as asym_padding  # type: ignore
    from cryptography.hazmat.primitives import serialization, hashes  # type: ignore
except Exception as err:  # pragma: no cover
    raise SystemExit("cryptography package is required. Install with 'pip install cryptography'") from err

from config_loader import config_value


def _cfg_str(cfg_key: str, env_name: str, default: str) -> str:
    val = os.getenv(env_name)
    if val is not None and val != "":
        return val
    cfg_val = config_value(cfg_key)
    if cfg_val is None or cfg_val == "":
        return default
    return str(cfg_val)


def _cfg_int(cfg_key: str, env_name: str, default: int) -> int:
    val = os.getenv(env_name)
    if val is not None and val != "":
        try:
            return int(val)
        except ValueError:
            print(f"[warn] Invalid integer for {env_name}: {val}")
    cfg_val = config_value(cfg_key)
    if isinstance(cfg_val, int):
        return cfg_val
    if isinstance(cfg_val, str) and cfg_val.strip():
        try:
            return int(cfg_val)
        except ValueError:
            print(f"[warn] Invalid integer in config for {cfg_key}: {cfg_val}")
    return default


BASE_URL = _cfg_str("base_url", "SD_BASE_URL", "http://localhost:8000")
API_BASE = f"{BASE_URL.rstrip('/')}/api"

USERNAME = _cfg_str("username", "SD_USERNAME", "tester")
PASSWORD = _cfg_str("password", "SD_PASSWORD", "P@ssw0rd!")

CONVERSATION_ID = _cfg_int("conversation_id", "SD_CONVERSATION_ID", 1)
CONTENT_KEY_NUMBER = _cfg_int("content_key_number", "SD_KEY_NUM", 1)

# Optional override AES content key (hex). Otherwise we unwrap via private key
CONTENT_KEY_HEX = _cfg_str("content_key_hex", "SD_CONTENT_KEY_HEX", "")

# Path to the input file (raw bytes to encrypt).
# This script now aligns with the JSON-driven workflow and will, by default,
# send the exact contents of the message JSON file defined in config
# (message_json_path) or SD_MESSAGE_JSON.
MESSAGE_JSON_PATH = os.getenv("SD_MESSAGE_JSON") or str(
    config_value("message_json_path", "ascripts/message_payload.json")
)
BLOB_PATH = os.getenv("SD_MESSAGE_BLOB") or MESSAGE_JSON_PATH


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


def login(username: str, password: str) -> tuple[str, dict]:
    url = f"{API_BASE}/auth/login"
    resp = _http_json("POST", url, {"username": username, "password": password})
    token = resp.get("token")
    if not token:
        raise RuntimeError("Login succeeded but no token returned")
    return token, resp.get("user", {})


def send_message(token: str, conversation_id: int, key_number: int, hex_payload: str) -> dict:
    url = f"{API_BASE}/messages"
    body = {
        "conversation_id": conversation_id,
        "content_key_number": key_number,
        "encrypted_msg_content": hex_payload,
    }
    return _http_json("POST", url, body, token)


def _encrypt_payload(plaintext_bytes: bytes, content_key_bytes: bytes) -> str:
    if len(content_key_bytes) not in (16, 24, 32):
        raise ValueError("Content key must be 16, 24, or 32 bytes")
    iv = os.urandom(12)
    aead = AESGCM(content_key_bytes)
    ciphertext = aead.encrypt(iv, plaintext_bytes, associated_data=None)
    return (iv + ciphertext).hex()


def _pbkdf2_sha256(password: str, salt_hex: str, iterations: int = 100000, dklen: int = 32) -> bytes:
    salt = bytes.fromhex(salt_hex)
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations, dklen)


def _aesgcm_decrypt_combined_hex(hex_data: str, key: bytes) -> bytes:
    b = bytes.fromhex(hex_data)
    iv, ct = b[:12], b[12:]
    aead = AESGCM(key)
    return aead.decrypt(iv, ct, associated_data=None)


def _load_private_key_from_pkcs8_der(pkcs8_der: bytes):
    return serialization.load_der_private_key(pkcs8_der, password=None)


def _rsa_oaep_decrypt(cipher_hex: str, private_key) -> bytes:
    cipher = bytes.fromhex(cipher_hex)
    return private_key.decrypt(
        cipher,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


def _get_conversation_info(token: str, conversation_id: int) -> dict:
    url = f"{API_BASE}/conversations/{conversation_id}"
    return _http_json("GET", url, None, token)


def _get_user(token: str) -> dict:
    url = f"{API_BASE}/auth/user"
    return _http_json("GET", url, None, token).get("user", {})


def _read_blob(path: str) -> bytes:
    file_path = Path(path).expanduser()
    if not file_path.is_absolute():
        file_path = (Path(__file__).resolve().parent / file_path).resolve()
    try:
        data = file_path.read_bytes()
        return data
    except FileNotFoundError:
        raise SystemExit(f"Blob file not found: {file_path}") from None
    except Exception as exc:
        raise SystemExit(f"Failed to read blob file: {exc}") from exc


def main() -> int:
    print("== SecureDove ascripts/send_message_from_blob.py ==")
    print(f"Base URL: {BASE_URL}")
    print(f"Username: {USERNAME}")
    print(f"Conversation ID: {CONVERSATION_ID} | Key #: {CONTENT_KEY_NUMBER}")
    print(f"Blob Path: {BLOB_PATH} (from message_json_path)")

    try:
        token, user = login(USERNAME, PASSWORD)
        print(f"Logged in as {user.get('username')} (id={user.get('id')})")
    except Exception as e:
        print(f"Login failed: {e}", file=sys.stderr)
        return 1

    # Resolve content key
    key_number = CONTENT_KEY_NUMBER
    if CONTENT_KEY_HEX:
        content_key_bytes = bytes.fromhex(CONTENT_KEY_HEX)
    else:
        if not PASSWORD:
            print("Error: password required to decrypt content key", file=sys.stderr)
            return 1
        salt_hex = user.get('salt')
        enc_pk_hex = user.get('encrypted_private_key')
        if not (salt_hex and enc_pk_hex):
            user = _get_user(token)
            salt_hex = user.get('salt')
            enc_pk_hex = user.get('encrypted_private_key')
        if not (salt_hex and enc_pk_hex):
            print("Error: encrypted private key/salt unavailable", file=sys.stderr)
            return 1
        pw_key = _pbkdf2_sha256(PASSWORD, salt_hex)
        try:
            pkcs8_der = _aesgcm_decrypt_combined_hex(enc_pk_hex, pw_key)
        except Exception as exc:
            print(f"Error decrypting encrypted private key: {exc}", file=sys.stderr)
            return 1
        private_key = _load_private_key_from_pkcs8_der(pkcs8_der)

        convo = _get_conversation_info(token, CONVERSATION_ID)
        convo_data = convo.get('conversation') or {}
        keys = convo_data.get('keys') or []
        if not keys:
            print("Error: no content keys for this conversation", file=sys.stderr)
            return 1
        if CONTENT_KEY_NUMBER <= 0:
            key_number = max(k.get('content_key_number', 0) for k in keys)
        entry = next((k for k in keys if int(k.get('content_key_number', -1)) == key_number), None)
        if not entry:
            print(f"Error: key number {key_number} not found", file=sys.stderr)
            return 1
        enc_ck_hex = entry.get('encrypted_content_key')
        if not enc_ck_hex:
            print("Error: encrypted content key missing", file=sys.stderr)
            return 1
        try:
            content_key_bytes = _rsa_oaep_decrypt(enc_ck_hex, private_key)
        except Exception as exc:
            print(f"Error unwrapping content key: {exc}", file=sys.stderr)
            return 1

    print(f"Using content_key_number={key_number}")

    # Read raw bytes and encrypt directly
    plaintext_bytes = _read_blob(BLOB_PATH)
    try:
        hex_payload = _encrypt_payload(plaintext_bytes, content_key_bytes)
    except Exception as exc:
        print(f"Error encrypting payload: {exc}", file=sys.stderr)
        return 1

    try:
        resp = send_message(token, CONVERSATION_ID, key_number, hex_payload)
        print("Message sent.")
        print(json.dumps(resp, indent=2))
        return 0
    except Exception as e:
        print(f"Send failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
