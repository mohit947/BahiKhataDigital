"""
Run once: adds upi_id and upi_name columns to organizations table.
Usage: cd backend && python migrate_upi.py
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = False
cur = conn.cursor()

SQL = """
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS upi_name VARCHAR(255);
"""

try:
    cur.execute(SQL)
    conn.commit()
    print("Migration complete: upi_id and upi_name added to organizations.")
except Exception as e:
    conn.rollback()
    print(f"Migration failed: {e}")
finally:
    cur.close()
    conn.close()
