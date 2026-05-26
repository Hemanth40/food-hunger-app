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
    Send OTP via TextBee or Twilio.
    phone: 10-digit Indian number or E.164 format.
    """
    # Prioritize TextBee.dev if credentials are configured
    if settings.TEXTBEE_API_KEY and settings.TEXTBEE_DEVICE_ID:
        from app.core.security import generate_otp
        from app.core.redis import store_otp

        if not otp:
            otp = generate_otp()

        # Store the generated OTP in Redis with expiry
        await store_otp(phone, otp)

        # Ensure E.164 format for India (+91...)
        clean_phone = phone.strip()
        if not clean_phone.startswith("+"):
            if clean_phone.startswith("91") and len(clean_phone) == 12:
                clean_phone = f"+{clean_phone}"
            else:
                clean_phone = f"+91{clean_phone}"

        import httpx
        url = f"https://api.textbee.dev/api/v1/gateway/devices/{settings.TEXTBEE_DEVICE_ID}/send-sms"
        headers = {
            "x-api-key": settings.TEXTBEE_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "recipients": [clean_phone],
            "message": f"Your Food Hunger App verification code is: {otp}. Valid for 5 minutes."
        }
        if settings.TEXTBEE_SIM_SUB_ID is not None:
            payload["simSubscriptionId"] = settings.TEXTBEE_SIM_SUB_ID

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                res_data = response.json()
                if response.status_code in (200, 201):
                    print(f"[SMS] TextBee OTP sent successfully to {clean_phone}")
                    return True
                else:
                    print(f"[SMS] TextBee API error {response.status_code}: {res_data}")
                    return False
        except Exception as e:
            print(f"[SMS] TextBee request failed: {e}")
            return False

    # Ensure E.164 format for India fallback
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
