#!/usr/bin/env python3
"""
Send a message using an existing bearer token (no login request).

Configuration
- Defaults come from ascripts/config.json. Environment variables override
  them: SD_TOKEN, SD_BASE_URL, SD_CONVERSATION_ID, SD_KEY_NUM, SD_MESSAGE,
  SD_PASSWORD, SD_CONTENT_KEY_HEX.
- Requires the `cryptography` package. The script unwraps the conversation
  content key using the user’s encrypted private key (needs SD_PASSWORD if
  SD_CONTENT_KEY_HEX not provided) and produces AES-GCM ciphertext. Failure
  to resolve the key results in an error.

Usage
  python3 ascripts/send_message_token.py
"""

from __future__ import annotations
import json
import os
import sys
import time
from urllib import request, error
import hashlib
try:
    # Optional: real AES-GCM encryption if 'cryptography' is available
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore
    from cryptography.hazmat.primitives.asymmetric import padding as asym_padding  # type: ignore
    from cryptography.hazmat.primitives import serialization, hashes  # type: ignore
except Exception:  # pragma: no cover
    AESGCM = None  # type: ignore

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

TOKEN = os.getenv("SD_TOKEN") or _cfg_str("token", "SD_TOKEN", "")
if not TOKEN:
    print("Error: SD_TOKEN environment variable or config token is required.", file=sys.stderr)
    sys.exit(2)

CONVERSATION_ID = _cfg_int("conversation_id", "SD_CONVERSATION_ID", 1)
CONTENT_KEY_NUMBER = _cfg_int("content_key_number", "SD_KEY_NUM", 1)
MESSAGE = _cfg_str("message", "SD_MESSAGE", "Hello from ascripts/send_message_token.py")

# Optional AES content key (hex). If provided and 'cryptography' is available,
# will produce proper AES-GCM (IV + ciphertext) hex. Otherwise the script will
# try to decrypt the user's encrypted private key (requires SD_PASSWORD) and
# derive the content key from the conversation entries.
CONTENT_KEY_HEX = _cfg_str("content_key_hex", "SD_CONTENT_KEY_HEX", "")
PASSWORD = os.getenv("SD_PASSWORD") or _cfg_str("password", "SD_PASSWORD", "")


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


def _get_user(token: str) -> dict:
    url = f"{API_BASE}/auth/user"
    return _http_json("GET", url, None, token)


def _get_conversation_info(token: str, conversation_id: int) -> dict:
    url = f"{API_BASE}/conversations/{conversation_id}"
    return _http_json("GET", url, None, token)


def main() -> int:
    print("== SecureDove ascripts/send_message_token.py ==")
    print(f"Base URL: {BASE_URL}")
    print(f"Conversation ID: {CONVERSATION_ID} | Key #: {CONTENT_KEY_NUMBER}")

    # Resolve AES content key
    key_number = CONTENT_KEY_NUMBER
    if CONTENT_KEY_HEX:
        content_key_bytes = bytes.fromhex(CONTENT_KEY_HEX)
    else:
        if not PASSWORD:
            print("Error: SD_PASSWORD (or password in config.json) required to decrypt content key", file=sys.stderr)
            return 1
        user = _get_user(TOKEN).get('user', {})
        salt_hex = user.get('salt')
        enc_pk_hex = user.get('encrypted_private_key')
        if not (salt_hex and enc_pk_hex):
            print("Error: user profile did not include encrypted private key and salt", file=sys.stderr)
            return 1
        pw_key = _pbkdf2_sha256(PASSWORD, salt_hex)
        try:
            pkcs8_der = _aesgcm_decrypt_combined_hex(enc_pk_hex, pw_key)
        except Exception as exc:
            print(f"Error decrypting encrypted private key (check password): {exc}", file=sys.stderr)
            return 1
        private_key = _load_private_key_from_pkcs8_der(pkcs8_der)

        convo = _get_conversation_info(TOKEN, CONVERSATION_ID)
        convo_data = convo.get('conversation') or {}
        keys = convo_data.get('keys') or []
        if not keys:
            print("Error: no content keys available for this conversation (are you a participant?)", file=sys.stderr)
            return 1
        if CONTENT_KEY_NUMBER <= 0:
            key_number = max(k.get('content_key_number', 0) for k in keys)
        entry = next((k for k in keys if int(k.get('content_key_number', -1)) == key_number), None)
        if not entry:
            print(f"Error: key number {key_number} not found in conversation", file=sys.stderr)
            return 1
        enc_ck_hex = entry.get('encrypted_content_key')
        if not enc_ck_hex:
            print("Error: encrypted content key missing in conversation entry", file=sys.stderr)
            return 1
        try:
            content_key_bytes = _rsa_oaep_decrypt(enc_ck_hex, private_key)
        except Exception as exc:
            print(f"Error unwrapping content key with RSA: {exc}", file=sys.stderr)
            return 1

    print(f"Using content_key_number={key_number}")

    # Build plaintext JSON and encrypt to hex (IV + ciphertext)
    plaintext = json.dumps({
        "timestamp": int(time.time() * 1000),
        "content": MESSAGE,
    }).encode("utf-8")

    try:
        hex_payload = _encrypt_payload(plaintext, content_key_bytes)
    except Exception as exc:
        print(f"Error encrypting payload: {exc}", file=sys.stderr)
        return 1

    try:
        resp = send_message(TOKEN, CONVERSATION_ID, key_number, hex_payload)
        print("Message sent.")
        print(json.dumps(resp, indent=2))
        return 0
    except Exception as e:
        print(f"Send failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
