import sqlite3

def main():
    conn = sqlite3.connect("foodhunger.db")
    cursor = conn.cursor()

    # Query donations
    print("=== DONATIONS ===")
    try:
        cursor.execute("SELECT id, food_type, latitude, longitude, pickup_address FROM donations")
        for row in cursor.fetchall():
            print(f"ID={row[0]}, Food={row[1]}, Lat={row[2]} ({type(row[2])}), Lng={row[3]} ({type(row[3])}), Address={row[4]}")
    except Exception as e:
        print("Error reading donations:", e)

    # Query users
    print("\n=== USERS ===")
    try:
        cursor.execute("SELECT id, full_name, role, latitude, longitude, address FROM users")
        for row in cursor.fetchall():
            print(f"ID={row[0]}, Name={row[1]}, Role={row[2]}, Lat={row[3]} ({type(row[3])}), Lng={row[4]} ({type(row[4])}), Address={row[5]}")
    except Exception as e:
        print("Error reading users:", e)

    # Query donation requests
    print("\n=== REQUESTS ===")
    try:
        cursor.execute("SELECT id, donation_id, receiver_id, assigned_driver_id, status FROM donation_requests")
        for row in cursor.fetchall():
            print(f"ID={row[0]}, DonID={row[1]}, RecID={row[2]}, DriverID={row[3]}, Status={row[4]}")
    except Exception as e:
        print("Error reading requests:", e)

    conn.close()

if __name__ == "__main__":
    main()
