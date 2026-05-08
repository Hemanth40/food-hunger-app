"""
SMS Service — Twilio Verify Integration for OTP delivery.
"""

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.core.config import settings


def _twilio_client() -> Client:
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


async def send_otp_sms(phone: str, otp: str = None) -> bool:
    """
    Send OTP via Twilio Verify to an Indian mobile number.
    phone: 10-digit Indian number (e.g. '9876543210')
    otp parameter is ignored — Twilio generates and sends the OTP.
    Returns True if sent successfully, False otherwise.
    """
    # Ensure E.164 format for India
    clean_phone = phone.strip()
    if not clean_phone.startswith("+"):
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = f"+{clean_phone}"
        else:
            clean_phone = f"+91{clean_phone}"

    try:
        client = _twilio_client()
        verification = client.verify.v2 \
            .services(settings.TWILIO_VERIFY_SERVICE_SID) \
            .verifications \
            .create(to=clean_phone, channel="sms")
        print(f"[SMS] Twilio OTP sent to {clean_phone} — SID: {verification.sid}")
        return True
    except TwilioRestException as e:
        print(f"[SMS] Twilio error: {e}")
        return False
    except Exception as e:
        print(f"[SMS] Failed to send OTP: {e}")
        return False


async def verify_otp_via_twilio(phone: str, code: str) -> bool:
    """
    Verify OTP code against Twilio Verify service.
    Returns True if the code is correct and not expired.
    """
    clean_phone = phone.strip()
    if not clean_phone.startswith("+"):
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = f"+{clean_phone}"
        else:
            clean_phone = f"+91{clean_phone}"

    try:
        client = _twilio_client()
        check = client.verify.v2 \
            .services(settings.TWILIO_VERIFY_SERVICE_SID) \
            .verification_checks \
            .create(to=clean_phone, code=code)
        print(f"[SMS] Twilio verify check status: {check.status}")
        return check.status == "approved"
    except TwilioRestException as e:
        print(f"[SMS] Twilio verify error: {e}")
        return False
    except Exception as e:
        print(f"[SMS] Verify check failed: {e}")
        return False
