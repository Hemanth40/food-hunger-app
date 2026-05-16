import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load env variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found.")
    sys.exit(1)

# Ensure async driver is used if not specified
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")

async def main():
    print(f"Connecting to DB...")
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.connect() as conn:
        try:
            # We use ALTER TYPE to add the new enum value.
            # We catch the exception if it already exists or if it's not supported in a transaction block
            # by executing it with isolation_level="AUTOCOMMIT"
            pass
        except Exception as e:
            pass

    # For ALTER TYPE we need to use a raw connection with no transaction block
    async with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            print("Adding 'driver_reached' to requeststatus ENUM...")
            await conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'driver_reached';"))
            print("Success! Enum value added.")
        except Exception as e:
            print(f"Error (might already exist): {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
