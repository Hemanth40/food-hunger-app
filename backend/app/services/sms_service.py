"""
SMS Service — Fast2SMS Integration for Indian mobile OTP delivery.
"""

import httpx
from app.core.config import settings

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


async def send_otp_sms(phone: str, otp: str) -> bool:
    """
    Send OTP SMS to an Indian mobile number via Fast2SMS.
    phone: 10-digit Indian number (e.g. '9876543210')
    otp: The OTP string to send
    Returns True if sent successfully, False otherwise.
    """
    # Strip country code if present (+91 or 91)
    clean_phone = phone.strip()
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("91") and len(clean_phone) == 12:
        clean_phone = clean_phone[2:]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                FAST2SMS_URL,
                headers={
                    "authorization": settings.FAST2SMS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "route": "q",
                    "message": f"Your Food Hunger App OTP is {otp}. Valid for 5 minutes. Do not share.",
                    "numbers": clean_phone,
                    "flash": 0,
                    "language": "english",
                },
            )
            result = response.json()
            if result.get("return") is True:
                print(f"[SMS] OTP sent to {clean_phone} successfully.")
                return True
            else:
                print(f"[SMS] Fast2SMS error: {result}")
                return False
    except Exception as e:
        print(f"[SMS] Failed to send OTP via Fast2SMS: {e}")
        return False
