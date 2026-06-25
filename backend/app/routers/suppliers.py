from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("/", response_model=List[schemas.SupplierOut])
def list_suppliers(
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Supplier).filter(models.Supplier.org_id == current_user.org_id)
    if active_only:
        query = query.filter(models.Supplier.is_active == True)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Supplier.name.ilike(term),
                models.Supplier.phone.ilike(term),
                models.Supplier.email.ilike(term),
                models.Supplier.contact_person.ilike(term),
            )
        )
    return query.order_by(models.Supplier.name).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.SupplierOut, status_code=201)
def create_supplier(
    supplier_in: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    supplier = models.Supplier(org_id=current_user.org_id, **supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=schemas.SupplierOut)
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.org_id == current_user.org_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=schemas.SupplierOut)
def update_supplier(
    supplier_id: str,
    supplier_in: schemas.SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.org_id == current_user.org_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for field, value in supplier_in.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.org_id == current_user.org_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.is_active = False
    db.commit()
