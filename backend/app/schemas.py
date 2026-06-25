from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


# ── Organization ──────────────────────────────────────────────────────────────

class OrganizationOut(BaseModel):
    id: UUID
    name: str
    gstin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    upi_id: Optional[str] = None
    upi_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    upi_id: Optional[str] = None
    upi_name: Optional[str] = None


# ── Auth ──────────────────────────────────────────────────────────────────────

class FirmRegisterCreate(BaseModel):
    """Public registration: creates org + admin user atomically."""
    firm_name: str
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v

    @field_validator("firm_name")
    @classmethod
    def firm_name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Firm name cannot be empty")
        return v


class UserInviteCreate(BaseModel):
    """Admin-only: add a staff user to the admin's org."""
    name: str
    email: EmailStr
    password: str
    role: str = "staff"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ("admin", "staff"):
            raise ValueError("Role must be admin or staff")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    is_active: bool
    org_id: UUID
    organization: Optional[OrganizationOut] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Product ───────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    unit: str = "pcs"
    rate: Decimal
    gst_rate: Decimal = Decimal("0")
    category: Optional[str] = None
    hsn_code: Optional[str] = None

    @field_validator("rate")
    @classmethod
    def rate_positive(cls, v):
        if v < 0:
            raise ValueError("Rate must be non-negative")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    rate: Optional[Decimal] = None
    gst_rate: Optional[Decimal] = None
    category: Optional[str] = None
    hsn_code: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    unit: str
    rate: Decimal
    gst_rate: Decimal
    category: Optional[str] = None
    hsn_code: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None


class CustomerOut(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    credit_balance: Decimal = Decimal("0")
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Payment Log ───────────────────────────────────────────────────────────────

class PaymentLogCreate(BaseModel):
    amount: Decimal
    method: str = "cash"
    note: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Payment amount must be positive")
        return v


class PaymentLogOut(BaseModel):
    id: UUID
    amount: Decimal
    method: str
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Bill ──────────────────────────────────────────────────────────────────────

class BillItemCreate(BaseModel):
    product_id: Optional[UUID] = None
    product_name: str
    unit: str = "pcs"
    quantity: Decimal
    rate: Decimal
    discount_percent: Decimal = Decimal("0")
    gst_percent: Decimal = Decimal("0")


class BillItemOut(BaseModel):
    id: UUID
    product_id: Optional[UUID] = None
    product_name: str
    unit: str
    quantity: Decimal
    rate: Decimal
    discount_percent: Decimal
    discount_amount: Decimal
    gst_percent: Decimal
    gst_amount: Decimal
    total: Decimal

    model_config = {"from_attributes": True}


class BillCreate(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    payment_method: str = "cash"
    payment_status: str = "pending"
    amount_paid: Decimal = Decimal("0")
    notes: Optional[str] = None
    items: List[BillItemCreate]


class BillUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    amount_paid: Optional[Decimal] = None
    notes: Optional[str] = None


class BillOut(BaseModel):
    id: UUID
    bill_number: str
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    subtotal: Decimal
    discount_total: Decimal
    gst_total: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    payment_method: str
    payment_status: str
    notes: Optional[str] = None
    created_at: datetime
    items: List[BillItemOut] = []
    creator: Optional[UserOut] = None
    customer: Optional[CustomerOut] = None
    payment_logs: List[PaymentLogOut] = []

    model_config = {"from_attributes": True}


class BillListOut(BaseModel):
    id: UUID
    bill_number: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    grand_total: Decimal
    amount_paid: Decimal
    payment_status: str
    payment_method: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreditLogOut(BaseModel):
    id: UUID
    amount: Decimal
    note: Optional[str] = None
    bill_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerWithBills(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    credit_balance: Decimal = Decimal("0")
    created_at: datetime
    total_bills: int = 0
    total_spent: Decimal = Decimal("0")
    bills: List[BillListOut] = []

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_bills: int
    total_revenue: Decimal
    pending_amount: Decimal
    bills_today: int
    revenue_today: Decimal
    top_products: List[dict]


# ── Supplier ──────────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierOut(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Staff ──────────────────────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    salary: Optional[Decimal] = None
    join_date: Optional[datetime] = None
    notes: Optional[str] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    salary: Optional[Decimal] = None
    join_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class StaffOut(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    salary: Optional[Decimal] = None
    join_date: Optional[datetime] = None
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Expense ────────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    title: str
    amount: Decimal
    category: str = "other"
    payment_method: str = "cash"
    expense_date: Optional[datetime] = None
    note: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    expense_date: Optional[datetime] = None
    note: Optional[str] = None

class ExpenseOut(BaseModel):
    id: UUID
    title: str
    amount: Decimal
    category: str
    payment_method: str
    expense_date: datetime
    note: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}
