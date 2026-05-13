"""
Firebase Admin SDK service — verifies Firebase Phone Auth ID tokens.
"""

import json
import os
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

_firebase_app = None


def _get_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if not sa_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON env var is not set")

    sa_dict = json.loads(sa_json)
    cred = credentials.Certificate(sa_dict)
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_firebase_id_token(id_token: str) -> dict:
    """
    Verify a Firebase Phone Auth ID token.
    Returns decoded claims including phone_number.
    Raises ValueError on failure.
    """
    try:
        _get_app()
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception as exc:
        raise ValueError(f"Firebase token verification failed: {exc}") from exc
