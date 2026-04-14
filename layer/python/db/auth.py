"""Password hashing utilities using PBKDF2 (stdlib, no external deps)."""

import hashlib
import os
import secrets


def hash_password(password: str) -> str:
    """Hash a password with a random salt. Returns 'salt:hash' hex string."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return salt.hex() + ":" + key.hex()


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored 'salt:hash' string."""
    try:
        salt_hex, key_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
    except (ValueError, AttributeError):
        return False

    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return secrets.compare_digest(key, expected_key)
