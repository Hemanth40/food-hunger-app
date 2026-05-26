import asyncio
from sqlalchemy import select
from app.core.database import sessionmanager
from app.models.donation import Donation
from app.models.donation_request import DonationRequest
from app.models.user import User

async def main():
    sessionmanager.init("postgresql+asyncpg://food_hunger_db_user:Xp7L8c6p3v9gD1R4JzK8@dpg-cso96l0gwrqc73ckr2kg-a.singapore-postgres.render.com/food_hunger_db")
    async with sessionmanager.session() as db:
        # Get all donations
        res_donations = await db.execute(select(Donation))
        donations = res_donations.scalars().all()
        print("=== DONATIONS ===")
        for d in donations:
            print(f"ID={d.id}, Food={d.food_type}, Lat={d.latitude}, Lng={d.longitude}, Address={d.pickup_address}")

        # Get all donation requests
        res_reqs = await db.execute(select(DonationRequest))
        reqs = res_reqs.scalars().all()
        print("\n=== REQUESTS ===")
        for r in reqs:
            print(f"ID={r.id}, DonID={r.donation_id}, RecID={r.receiver_id}, DriverID={r.assigned_driver_id}, Status={r.status.value}, DriverLat={r.driver_latitude}, DriverLng={r.driver_longitude}")

        # Get all users
        res_users = await db.execute(select(User))
        users = res_users.scalars().all()
        print("\n=== USERS ===")
        for u in users:
            print(f"ID={u.id}, Name={u.full_name}, Role={u.role.value}, Lat={u.latitude}, Lng={u.longitude}, Address={u.address}")

    await sessionmanager.close()

if __name__ == "__main__":
    asyncio.run(main())
