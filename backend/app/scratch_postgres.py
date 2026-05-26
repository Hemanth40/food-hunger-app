import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://food_hunger_db_user:Xp7L8c6p3v9gD1R4JzK8@dpg-cso96l0gwrqc73ckr2kg.singapore-postgres.render.com/food_hunger_db", ssl=True)
    
    # Query donations
    print("=== PRODUCTION DONATIONS ===")
    try:
        rows = await conn.fetch("SELECT id, food_type, latitude, longitude, pickup_address FROM donations")
        for row in rows:
            print(f"ID={row['id']}, Food={row['food_type']}, Lat={row['latitude']} ({type(row['latitude'])}), Lng={row['longitude']} ({type(row['longitude'])}), Address={row['pickup_address']}")
    except Exception as e:
        print("Error reading donations:", e)

    # Query users
    print("\n=== PRODUCTION USERS ===")
    try:
        rows = await conn.fetch("SELECT id, full_name, role, latitude, longitude, address FROM users")
        for row in rows:
            print(f"ID={row['id']}, Name={row['full_name']}, Role={row['role']}, Lat={row['latitude']} ({type(row['latitude'])}), Lng={row['longitude']} ({type(row['longitude'])}), Address={row['address']}")
    except Exception as e:
        print("Error reading users:", e)

    # Query requests
    print("\n=== PRODUCTION REQUESTS ===")
    try:
        rows = await conn.fetch("SELECT id, donation_id, receiver_id, assigned_driver_id, status FROM donation_requests")
        for row in rows:
            print(f"ID={row['id']}, DonID={row['donation_id']}, RecID={row['receiver_id']}, DriverID={row['assigned_driver_id']}, Status={row['status']}")
    except Exception as e:
        print("Error reading requests:", e)

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
