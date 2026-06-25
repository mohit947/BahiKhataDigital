from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/expenses", tags=["expenses"])

CATEGORIES = ["rent", "salary", "utilities", "transport", "raw_materials", "marketing", "maintenance", "other"]


@router.get("/categories")
def get_categories():
    return CATEGORIES


@router.get("/stats")
def expense_stats(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Expense breakdown by category for a date range (for P&L report)."""
    org_id = current_user.org_id
    rows = (
        db.query(
            models.Expense.category,
            func.count(models.Expense.id).label("count"),
            func.sum(models.Expense.amount).label("total"),
        )
        .filter(
            models.Expense.org_id == org_id,
            cast(models.Expense.expense_date, Date) >= date_from,
            cast(models.Expense.expense_date, Date) <= date_to,
        )
        .group_by(models.Expense.category)
        .all()
    )
    total = sum(float(r.total or 0) for r in rows)
    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "by_category": [
            {"category": r.category, "count": r.count, "total": float(r.total or 0)}
            for r in rows
        ],
        "total": total,
    }


@router.get("/", response_model=List[schemas.ExpenseOut])
def list_expenses(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Expense).filter(models.Expense.org_id == current_user.org_id)
    if date_from:
        query = query.filter(cast(models.Expense.expense_date, Date) >= date_from)
    if date_to:
        query = query.filter(cast(models.Expense.expense_date, Date) <= date_to)
    if category:
        query = query.filter(models.Expense.category == category)
    return query.order_by(models.Expense.expense_date.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.ExpenseOut, status_code=201)
def create_expense(
    expense_in: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    data = expense_in.model_dump()
    if not data.get("expense_date"):
        data["expense_date"] = datetime.utcnow()
    expense = models.Expense(
        org_id=current_user.org_id,
        created_by=current_user.id,
        **data,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(
    expense_id: str,
    expense_in: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.org_id == current_user.org_id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in expense_in.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.org_id == current_user.org_id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
