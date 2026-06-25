"""Run this once to create the first admin user."""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models import User
from app.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

name = input("Admin name: ").strip()
email = input("Admin email: ").strip()
password = input("Admin password (min 8 chars): ").strip()

if len(password) < 8:
    print("Password too short!")
    sys.exit(1)

existing = db.query(User).filter(User.email == email).first()
if existing:
    print(f"User {email} already exists!")
    sys.exit(1)

user = User(
    name=name,
    email=email,
    password_hash=hash_password(password),
    role="admin",
)
db.add(user)
db.commit()
print(f"\n✅ Admin user '{name}' ({email}) created successfully!")
db.close()
