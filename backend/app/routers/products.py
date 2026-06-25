from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.deps import get_current_user, require_admin

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[schemas.ProductOut])
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    active_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Product).filter(models.Product.org_id == current_user.org_id)
    if active_only:
        query = query.filter(models.Product.is_active == True)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Product.name.ilike(term),
                models.Product.sku.ilike(term),
                models.Product.category.ilike(term),
            )
        )
    if category:
        query = query.filter(models.Product.category == category)
    return query.order_by(models.Product.name).offset(skip).limit(limit).all()


@router.get("/categories", response_model=List[str])
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Product.category)
        .filter(
            models.Product.org_id == current_user.org_id,
            models.Product.category != None,
            models.Product.is_active == True,
        )
        .distinct()
        .all()
    )
    return [r[0] for r in rows if r[0]]


@router.post("/", response_model=schemas.ProductOut, status_code=201)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if product_in.sku:
        existing = (
            db.query(models.Product)
            .filter(
                models.Product.sku == product_in.sku,
                models.Product.org_id == current_user.org_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")

    product = models.Product(
        org_id=current_user.org_id,
        **product_in.model_dump(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    product = (
        db.query(models.Product)
        .filter(
            models.Product.id == product_id,
            models.Product.org_id == current_user.org_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: str,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    product = (
        db.query(models.Product)
        .filter(
            models.Product.id == product_id,
            models.Product.org_id == current_user.org_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    product = (
        db.query(models.Product)
        .filter(
            models.Product.id == product_id,
            models.Product.org_id == current_user.org_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()
