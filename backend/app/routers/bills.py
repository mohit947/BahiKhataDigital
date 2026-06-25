from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, Date
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, date
from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.config import settings
from app.cache import cache_get, cache_set, stats_key, report_key, invalidate_org

router = APIRouter(prefix="/bills", tags=["bills"])


def get_financial_year(dt: datetime) -> str:
    year = dt.year
    if dt.month < 4:
        year -= 1
    return f"{year}-{str(year + 1)[2:]}"


def next_bill_number(db: Session, org_id) -> str:
    fy = get_financial_year(datetime.utcnow())
    seq = (
        db.query(models.BillSequence)
        .filter(
            models.BillSequence.financial_year == fy,
            models.BillSequence.org_id == org_id,
        )
        .first()
    )
    if not seq:
        seq = models.BillSequence(financial_year=fy, org_id=org_id, last_number=0)
        db.add(seq)
    seq.last_number += 1
    db.flush()
    return f"VT/{fy}/{seq.last_number:04d}"


def compute_items(items_in: list):
    subtotal = Decimal("0")
    discount_total = Decimal("0")
    gst_total = Decimal("0")
    computed = []
    for item in items_in:
        base = Decimal(str(item.quantity)) * Decimal(str(item.rate))
        disc_pct = Decimal(str(item.discount_percent))
        disc_amt = (base * disc_pct / 100).quantize(Decimal("0.01"))
        taxable = base - disc_amt
        gst_pct = Decimal(str(item.gst_percent))
        gst_amt = (taxable * gst_pct / 100).quantize(Decimal("0.01"))
        total = (taxable + gst_amt).quantize(Decimal("0.01"))
        subtotal += base
        discount_total += disc_amt
        gst_total += gst_amt
        computed.append({
            "product_id": item.product_id,
            "product_name": item.product_name,
            "unit": item.unit,
            "quantity": item.quantity,
            "rate": item.rate,
            "discount_percent": disc_pct,
            "discount_amount": disc_amt,
            "gst_percent": gst_pct,
            "gst_amount": gst_amt,
            "total": total,
        })
    grand_total = (subtotal - discount_total + gst_total).quantize(Decimal("0.01"))
    return computed, subtotal, discount_total, gst_total, grand_total


def _load_bill(db: Session, bill_id: str, org_id=None) -> models.Bill:
    bill = (
        db.query(models.Bill)
        .options(
            joinedload(models.Bill.items),
            joinedload(models.Bill.creator),
            joinedload(models.Bill.customer),
            joinedload(models.Bill.payment_logs),
        )
        .filter(models.Bill.id == bill_id)
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if org_id is not None and str(bill.org_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.BillOut, status_code=201)
def create_bill(
    bill_in: schemas.BillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not bill_in.items:
        raise HTTPException(status_code=400, detail="Bill must have at least one item")

    computed_items, subtotal, discount_total, gst_total, grand_total = compute_items(bill_in.items)

    customer_name = bill_in.customer_name
    customer_phone = bill_in.customer_phone
    customer_address = bill_in.customer_address
    customer_gstin = bill_in.customer_gstin

    if bill_in.customer_id:
        cust = (
            db.query(models.Customer)
            .filter(
                models.Customer.id == bill_in.customer_id,
                models.Customer.org_id == current_user.org_id,
            )
            .first()
        )
        if cust:
            customer_name = customer_name or cust.name
            customer_phone = customer_phone or cust.phone
            customer_address = customer_address or cust.address
            customer_gstin = customer_gstin or cust.gstin

    amount_paid_dec = Decimal(str(bill_in.amount_paid))
    if amount_paid_dec >= grand_total:
        derived_status = "paid"
    elif amount_paid_dec > 0:
        derived_status = "partial"
    else:
        derived_status = bill_in.payment_status  # "pending" or explicit override

    bill = models.Bill(
        org_id=current_user.org_id,
        bill_number=next_bill_number(db, current_user.org_id),
        customer_id=bill_in.customer_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_address=customer_address,
        customer_gstin=customer_gstin,
        subtotal=subtotal,
        discount_total=discount_total,
        gst_total=gst_total,
        grand_total=grand_total,
        amount_paid=bill_in.amount_paid,
        payment_method=bill_in.payment_method,
        payment_status=derived_status,
        notes=bill_in.notes,
        created_by=current_user.id,
    )
    db.add(bill)
    db.flush()

    for item_data in computed_items:
        db.add(models.BillItem(bill_id=bill.id, **item_data))

    # Log initial payment if amount_paid > 0
    if bill_in.amount_paid and Decimal(str(bill_in.amount_paid)) > 0:
        db.add(models.PaymentLog(
            bill_id=bill.id,
            amount=bill_in.amount_paid,
            method=bill_in.payment_method,
            note="Initial payment",
            created_by=current_user.id,
        ))

    db.commit()
    invalidate_org(current_user.org_id)
    return _load_bill(db, str(bill.id), org_id=current_user.org_id)


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.BillListOut])
def list_bills(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Bill).filter(models.Bill.org_id == current_user.org_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            models.Bill.bill_number.ilike(term) |
            models.Bill.customer_name.ilike(term) |
            models.Bill.customer_phone.ilike(term)
        )
    if status:
        query = query.filter(models.Bill.payment_status == status)
    if date_from:
        query = query.filter(cast(models.Bill.created_at, Date) >= date_from)
    if date_to:
        query = query.filter(cast(models.Bill.created_at, Date) <= date_to)
    return query.order_by(models.Bill.created_at.desc()).offset(skip).limit(limit).all()


# ── Stats / Dashboard ─────────────────────────────────────────────────────────

@router.get("/stats", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()
    org_id = current_user.org_id

    key = stats_key(org_id)
    cached = cache_get(key)
    if cached:
        return schemas.DashboardStats(**cached)

    total_bills = db.query(func.count(models.Bill.id)).filter(
        models.Bill.org_id == org_id,
        models.Bill.payment_status != "cancelled",
    ).scalar()

    total_revenue = db.query(func.sum(models.Bill.amount_paid)).filter(
        models.Bill.org_id == org_id,
        models.Bill.payment_status != "cancelled",
    ).scalar() or Decimal("0")

    pending = db.query(func.sum(models.Bill.grand_total - models.Bill.amount_paid)).filter(
        models.Bill.org_id == org_id,
        models.Bill.payment_status.in_(["pending", "partial"]),
    ).scalar() or Decimal("0")

    bills_today = db.query(func.count(models.Bill.id)).filter(
        models.Bill.org_id == org_id,
        cast(models.Bill.created_at, Date) == today,
        models.Bill.payment_status != "cancelled",
    ).scalar()

    revenue_today = db.query(func.sum(models.Bill.amount_paid)).filter(
        models.Bill.org_id == org_id,
        cast(models.Bill.created_at, Date) == today,
        models.Bill.payment_status != "cancelled",
    ).scalar() or Decimal("0")

    top_products = (
        db.query(
            models.BillItem.product_name,
            func.sum(models.BillItem.total).label("revenue"),
            func.sum(models.BillItem.quantity).label("qty"),
        )
        .join(models.Bill)
        .filter(
            models.Bill.org_id == org_id,
            models.Bill.payment_status != "cancelled",
        )
        .group_by(models.BillItem.product_name)
        .order_by(func.sum(models.BillItem.total).desc())
        .limit(5).all()
    )

    result = schemas.DashboardStats(
        total_bills=total_bills,
        total_revenue=total_revenue,
        pending_amount=pending,
        bills_today=bills_today,
        revenue_today=revenue_today,
        top_products=[{"name": r[0], "revenue": r[1], "qty": r[2]} for r in top_products],
    )
    cache_set(key, result.model_dump(), ttl=60)
    return result


@router.get("/report")
def revenue_report(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Day-by-day revenue breakdown for a date range."""
    org_id = current_user.org_id

    rkey = report_key(org_id, date_from, date_to)
    cached_report = cache_get(rkey)
    if cached_report:
        return cached_report

    rows = (
        db.query(
            cast(models.Bill.created_at, Date).label("day"),
            func.count(models.Bill.id).label("count"),
            func.sum(models.Bill.grand_total).label("total"),
            func.sum(models.Bill.amount_paid).label("collected"),
        )
        .filter(
            models.Bill.org_id == org_id,
            cast(models.Bill.created_at, Date) >= date_from,
            cast(models.Bill.created_at, Date) <= date_to,
            models.Bill.payment_status != "cancelled",
        )
        .group_by(cast(models.Bill.created_at, Date))
        .order_by(cast(models.Bill.created_at, Date))
        .all()
    )

    # Payment method breakdown
    method_rows = (
        db.query(
            models.Bill.payment_method,
            func.count(models.Bill.id).label("count"),
            func.sum(models.Bill.amount_paid).label("collected"),
        )
        .filter(
            models.Bill.org_id == org_id,
            cast(models.Bill.created_at, Date) >= date_from,
            cast(models.Bill.created_at, Date) <= date_to,
            models.Bill.payment_status != "cancelled",
        )
        .group_by(models.Bill.payment_method)
        .all()
    )

    report_data = {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "daily": [
            {"day": str(r.day), "count": r.count, "total": float(r.total or 0), "collected": float(r.collected or 0)}
            for r in rows
        ],
        "by_method": [
            {"method": r.payment_method, "count": r.count, "collected": float(r.collected or 0)}
            for r in method_rows
        ],
        "summary": {
            "total_bills": sum(r.count for r in rows),
            "total_billed": float(sum(r.total or 0 for r in rows)),
            "total_collected": float(sum(r.collected or 0 for r in rows)),
        },
    }
    cache_set(rkey, report_data, ttl=300)
    return report_data


# ── Single Bill CRUD ──────────────────────────────────────────────────────────

@router.get("/{bill_id}", response_model=schemas.BillOut)
def get_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _load_bill(db, bill_id, org_id=current_user.org_id)


@router.put("/{bill_id}", response_model=schemas.BillOut)
def update_bill(
    bill_id: str,
    bill_in: schemas.BillUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = (
        db.query(models.Bill)
        .filter(
            models.Bill.id == bill_id,
            models.Bill.org_id == current_user.org_id,
        )
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    for field, value in bill_in.model_dump(exclude_unset=True).items():
        setattr(bill, field, value)
    db.commit()
    return _load_bill(db, bill_id, org_id=current_user.org_id)


# ── Payment ───────────────────────────────────────────────────────────────────

@router.post("/{bill_id}/payments", response_model=schemas.BillOut)
def add_payment(
    bill_id: str,
    payment: schemas.PaymentLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Record a payment. If payment exceeds balance, excess goes to customer credit."""
    bill = (
        db.query(models.Bill)
        .filter(
            models.Bill.id == bill_id,
            models.Bill.org_id == current_user.org_id,
        )
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.payment_status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot add payment to a cancelled bill")
    if bill.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Bill is already fully paid")

    balance_due = Decimal(str(bill.grand_total)) - Decimal(str(bill.amount_paid))
    payment_amount = Decimal(str(payment.amount))

    # Log the full payment amount as received
    db.add(models.PaymentLog(
        bill_id=bill.id,
        amount=payment.amount,
        method=payment.method,
        note=payment.note,
        created_by=current_user.id,
    ))

    if payment_amount >= balance_due:
        # Bill fully paid; any excess goes to customer credit
        excess = payment_amount - balance_due
        bill.amount_paid = bill.grand_total
        bill.payment_status = "paid"
        bill.payment_method = payment.method

        if excess > 0 and bill.customer_id:
            customer = (
                db.query(models.Customer)
                .filter(
                    models.Customer.id == bill.customer_id,
                    models.Customer.org_id == current_user.org_id,
                )
                .first()
            )
            if customer:
                customer.credit_balance = Decimal(str(customer.credit_balance)) + excess
                db.add(models.CreditLog(
                    customer_id=customer.id,
                    bill_id=bill.id,
                    amount=excess,
                    note=f"Overpayment from bill {bill.bill_number}",
                ))
    else:
        bill.amount_paid = Decimal(str(bill.amount_paid)) + payment_amount
        bill.payment_method = payment.method
        bill.payment_status = "partial" if bill.amount_paid > 0 else "pending"

    db.commit()
    invalidate_org(current_user.org_id)
    return _load_bill(db, bill_id, org_id=current_user.org_id)


@router.post("/{bill_id}/apply-credit", response_model=schemas.BillOut)
def apply_credit(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Apply available customer credit balance to this bill (with confirmation from frontend)."""
    bill = (
        db.query(models.Bill)
        .filter(
            models.Bill.id == bill_id,
            models.Bill.org_id == current_user.org_id,
        )
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if not bill.customer_id:
        raise HTTPException(status_code=400, detail="Bill has no linked customer")
    if bill.payment_status in ("paid", "cancelled"):
        raise HTTPException(status_code=400, detail="Bill is already paid or cancelled")

    customer = (
        db.query(models.Customer)
        .filter(
            models.Customer.id == bill.customer_id,
            models.Customer.org_id == current_user.org_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    credit = Decimal(str(customer.credit_balance))
    if credit <= 0:
        raise HTTPException(status_code=400, detail="Customer has no credit balance")

    balance_due = Decimal(str(bill.grand_total)) - Decimal(str(bill.amount_paid))
    amount_to_apply = min(credit, balance_due)

    # Deduct from customer credit
    customer.credit_balance = credit - amount_to_apply

    # Apply to bill
    bill.amount_paid = Decimal(str(bill.amount_paid)) + amount_to_apply
    bill.payment_status = "paid" if bill.amount_paid >= Decimal(str(bill.grand_total)) else "partial"

    # Log the credit application
    db.add(models.PaymentLog(
        bill_id=bill.id,
        amount=amount_to_apply,
        method="credit",
        note="Customer credit applied",
        created_by=current_user.id,
    ))
    db.add(models.CreditLog(
        customer_id=customer.id,
        bill_id=bill.id,
        amount=-amount_to_apply,
        note=f"Credit used on bill {bill.bill_number}",
    ))

    db.commit()
    invalidate_org(current_user.org_id)
    return _load_bill(db, bill_id, org_id=current_user.org_id)


@router.get("/{bill_id}/payments", response_model=List[schemas.PaymentLogOut])
def get_payments(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify bill belongs to current org
    bill = db.query(models.Bill).filter(
        models.Bill.id == bill_id,
        models.Bill.org_id == current_user.org_id,
    ).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return (
        db.query(models.PaymentLog)
        .filter(models.PaymentLog.bill_id == bill_id)
        .order_by(models.PaymentLog.created_at)
        .all()
    )


# ── Cancel ────────────────────────────────────────────────────────────────────

@router.post("/{bill_id}/cancel", response_model=schemas.BillOut)
def cancel_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = (
        db.query(models.Bill)
        .filter(
            models.Bill.id == bill_id,
            models.Bill.org_id == current_user.org_id,
        )
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Cannot cancel a paid bill")
    bill.payment_status = "cancelled"
    db.commit()
    invalidate_org(current_user.org_id)
    return _load_bill(db, bill_id, org_id=current_user.org_id)


# ── Duplicate ─────────────────────────────────────────────────────────────────

@router.post("/{bill_id}/duplicate", response_model=schemas.BillOut, status_code=201)
def duplicate_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    original = _load_bill(db, bill_id, org_id=current_user.org_id)

    new_bill = models.Bill(
        org_id=current_user.org_id,
        bill_number=next_bill_number(db, current_user.org_id),
        customer_id=original.customer_id,
        customer_name=original.customer_name,
        customer_phone=original.customer_phone,
        customer_address=original.customer_address,
        customer_gstin=original.customer_gstin,
        subtotal=original.subtotal,
        discount_total=original.discount_total,
        gst_total=original.gst_total,
        grand_total=original.grand_total,
        amount_paid=Decimal("0"),
        payment_method=original.payment_method,
        payment_status="pending",
        notes=original.notes,
        created_by=current_user.id,
    )
    db.add(new_bill)
    db.flush()

    for item in original.items:
        db.add(models.BillItem(
            bill_id=new_bill.id,
            product_id=item.product_id,
            product_name=item.product_name,
            unit=item.unit,
            quantity=item.quantity,
            rate=item.rate,
            discount_percent=item.discount_percent,
            discount_amount=item.discount_amount,
            gst_percent=item.gst_percent,
            gst_amount=item.gst_amount,
            total=item.total,
        ))

    db.commit()
    invalidate_org(current_user.org_id)
    return _load_bill(db, str(new_bill.id), org_id=current_user.org_id)


# ── QR Data ───────────────────────────────────────────────────────────────────

@router.get("/{bill_id}/qr-data")
def get_qr_data(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = (
        db.query(models.Bill)
        .filter(
            models.Bill.id == bill_id,
            models.Bill.org_id == current_user.org_id,
        )
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    balance = float(bill.grand_total) - float(bill.amount_paid)
    amount = balance if balance > 0 else float(bill.grand_total)
    upi_id = settings.UPI_ID
    name = settings.UPI_NAME.replace(" ", "%20")
    upi_link = f"upi://pay?pa={upi_id}&pn={name}&am={amount:.2f}&cu=INR&tn=Bill%20{bill.bill_number}"
    return {
        "upi_link": upi_link,
        "bill_number": bill.bill_number,
        "amount": amount,
        "balance": balance,
        "upi_id": upi_id,
    }
