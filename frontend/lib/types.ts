export interface Organization {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  upi_id?: string;
  upi_name?: string;
  created_at: string;
}

export interface User {
  id: string; name: string; email: string; role: "admin" | "staff";
  is_active: boolean; org_id: string; organization?: Organization; created_at: string;
}

export interface Product {
  id: string; name: string; description?: string; sku?: string;
  unit: string; rate: number; gst_rate: number; category?: string;
  hsn_code?: string; is_active: boolean; created_at: string; updated_at: string;
}

export interface Customer {
  id: string; name: string; phone?: string; email?: string;
  address?: string; gstin?: string; credit_balance: number; created_at: string;
}

export interface CustomerWithBills extends Customer {
  total_bills: number;
  total_spent: number;
  bills: BillListItem[];
}

export interface BillItem {
  id: string; product_id?: string; product_name: string; unit: string;
  quantity: number; rate: number; discount_percent: number; discount_amount: number;
  gst_percent: number; gst_amount: number; total: number;
}

export interface BillItemDraft {
  product_id?: string; product_name: string; unit: string;
  quantity: number; rate: number; discount_percent: number; gst_percent: number;
  discount_amount: number; gst_amount: number; total: number;
}

export interface PaymentLog {
  id: string; amount: number; method: string; note?: string; created_at: string;
}

export interface Bill {
  id: string; bill_number: string;
  customer_id?: string;
  customer_name?: string; customer_phone?: string;
  customer_address?: string; customer_gstin?: string;
  subtotal: number; discount_total: number; gst_total: number;
  grand_total: number; amount_paid: number; payment_method: string;
  payment_status: "paid" | "pending" | "partial" | "cancelled";
  notes?: string; created_at: string; items: BillItem[];
  creator?: User; customer?: Customer; payment_logs: PaymentLog[];
}

export interface BillListItem {
  id: string; bill_number: string; customer_name?: string;
  customer_phone?: string; grand_total: number; amount_paid: number;
  payment_status: string; payment_method: string; created_at: string;
}

export interface DashboardStats {
  total_bills: number; total_revenue: number; pending_amount: number;
  bills_today: number; revenue_today: number;
  top_products: { name: string; revenue: number; qty: number }[];
}

export interface Supplier {
  id: string; name: string; phone?: string; email?: string;
  address?: string; gstin?: string; contact_person?: string;
  notes?: string; is_active: boolean; created_at: string; updated_at: string;
}

export interface StaffMember {
  id: string; name: string; phone?: string; email?: string;
  role?: string; salary?: number; join_date?: string;
  is_active: boolean; notes?: string; created_at: string;
}

export interface Expense {
  id: string; title: string; amount: number; category: string;
  payment_method: string; expense_date: string; note?: string; created_at: string;
}
