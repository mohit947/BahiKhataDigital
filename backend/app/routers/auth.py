from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import verify_password, hash_password, create_access_token
from app.deps import get_current_user, require_admin
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register(request: Request, firm_in: schemas.FirmRegisterCreate, db: Session = Depends(get_db)):
    """Create a new firm (organization) and its admin user in one transaction."""
    existing = db.query(models.User).filter(models.User.email == firm_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = models.Organization(name=firm_in.firm_name.strip())
    db.add(org)
    db.flush()

    user = models.User(
        org_id=org.id,
        name=firm_in.name,
        email=firm_in.email,
        password_hash=hash_password(firm_in.password),
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(org)
    user.organization = org

    token = create_access_token({"sub": str(user.id), "org": str(org.id)})
    return {"access_token": token, "user": user}


@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .join(models.Organization)
        .filter(
            models.User.email == credentials.email,
            models.Organization.is_active == True,
        )
        .first()
    )
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact your admin.")

    token = create_access_token({"sub": str(user.id), "org": str(user.org_id)})
    return {"access_token": token, "user": user}


@router.post("/invite", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def invite_user(
    user_in: schemas.UserInviteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Admin-only: add a staff (or admin) user to the current org."""
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        org_id=current_user.org_id,
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "org": str(user.org_id)})
    return {"access_token": token, "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/org", response_model=schemas.OrganizationOut)
def update_org(
    org_in: schemas.OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Admin-only: update the current org's details."""
    org = db.query(models.Organization).filter(models.Organization.id == current_user.org_id).first()
    for field, value in org_in.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org


@router.get("/users", response_model=list[schemas.UserOut])
def list_org_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Admin-only: list all users in the current org."""
    return db.query(models.User).filter(models.User.org_id == current_user.org_id).all()
