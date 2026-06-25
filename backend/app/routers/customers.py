from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from decimal import Decimal
from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=List[schemas.CustomerOut])
def list_customers(
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Customer).filter(models.Customer.org_id == current_user.org_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Customer.name.ilike(term),
                models.Customer.phone.ilike(term),
                models.Customer.email.ilike(term),
            )
        )
    return query.order_by(models.Customer.name).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.CustomerOut, status_code=201)
def create_customer(
    customer_in: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = models.Customer(
        org_id=current_user.org_id,
        **customer_in.model_dump(),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=schemas.CustomerWithBills)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = (
        db.query(models.Customer)
        .filter(
            models.Customer.id == customer_id,
            models.Customer.org_id == current_user.org_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    bills = (
        db.query(models.Bill)
        .filter(
            models.Bill.customer_id == customer_id,
            models.Bill.org_id == current_user.org_id,
        )
        .order_by(models.Bill.created_at.desc())
        .all()
    )

    total_spent = sum(float(b.grand_total) for b in bills)

    return schemas.CustomerWithBills(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        gstin=customer.gstin,
        credit_balance=customer.credit_balance,
        created_at=customer.created_at,
        total_bills=len(bills),
        total_spent=Decimal(str(total_spent)),
        bills=[schemas.BillListOut.model_validate(b) for b in bills],
    )


@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    customer_id: str,
    customer_in: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = (
        db.query(models.Customer)
        .filter(
            models.Customer.id == customer_id,
            models.Customer.org_id == current_user.org_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in customer_in.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer
