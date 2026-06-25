from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("/", response_model=List[schemas.StaffOut])
def list_staff(
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Staff).filter(models.Staff.org_id == current_user.org_id)
    if active_only:
        query = query.filter(models.Staff.is_active == True)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Staff.name.ilike(term),
                models.Staff.phone.ilike(term),
                models.Staff.role.ilike(term),
            )
        )
    return query.order_by(models.Staff.name).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.StaffOut, status_code=201)
def create_staff(
    staff_in: schemas.StaffCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    staff = models.Staff(org_id=current_user.org_id, **staff_in.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/{staff_id}", response_model=schemas.StaffOut)
def get_staff_member(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = db.query(models.Staff).filter(
        models.Staff.id == staff_id,
        models.Staff.org_id == current_user.org_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return member


@router.put("/{staff_id}", response_model=schemas.StaffOut)
def update_staff(
    staff_id: str,
    staff_in: schemas.StaffUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = db.query(models.Staff).filter(
        models.Staff.id == staff_id,
        models.Staff.org_id == current_user.org_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    for field, value in staff_in.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{staff_id}", status_code=204)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = db.query(models.Staff).filter(
        models.Staff.id == staff_id,
        models.Staff.org_id == current_user.org_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    member.is_active = False
    db.commit()
