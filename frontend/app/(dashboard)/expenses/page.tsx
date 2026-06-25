"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "@/lib/api";
import { Expense } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Receipt, X, Trash2, TrendingUp, List, Tag } from "lucide-react";
import { useT } from "@/lib/i18n";

const CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "salary", label: "Salary" },
  { value: "utilities", label: "Utilities" },
  { value: "transport", label: "Transport" },
  { value: "raw_materials", label: "Raw Materials" },
  { value: "marketing", label: "Marketing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
];

const CATEGORY_BADGE: Record<string, string> = {
  rent: "bg-red-100 text-red-700",
  salary: "bg-blue-100 text-blue-700",
  utilities: "bg-yellow-100 text-yellow-700",
  transport: "bg-orange-100 text-orange-700",
  raw_materials: "bg-green-100 text-green-700",
  marketing: "bg-purple-100 text-purple-700",
  maintenance: "bg-slate-100 text-slate-600",
  other: "bg-gray-100 text-gray-600",
};

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const schema = z.object({
  title: z.string().min(1, "Title required"),
  amount: z.string().min(1, "Amount required"),
  category: z.string().min(1, "Category required"),
  payment_method: z.string().min(1, "Payment method required"),
  expense_date: z.string().min(1, "Date required"),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function ExpenseModal({ expense, onClose }: { expense?: Expense; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useT();
  const isEdit = !!expense;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          title: expense.title,
          amount: String(expense.amount),
          category: expense.category,
          payment_method: expense.payment_method,
          expense_date: expense.expense_date,
          note: expense.note ?? "",
        }
      : {
          expense_date: todayStr(),
          category: "",
          payment_method: "",
        },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, amount: parseFloat(data.amount) };
      return isEdit ? expensesApi.update(expense!.id, payload) : expensesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(isEdit ? "Expense updated" : "Expense added");
      onClose();
    },
    onError: () => toast.error("Failed to save expense"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? "Edit Expense" : "Add Expense"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input {...register("title")} placeholder="e.g. Office Rent" className="input-field" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount (₹) *</label>
              <input type="number" min="0" step="0.01" {...register("amount")} placeholder="0.00" className="input-field" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
              <input type="date" {...register("expense_date")} className="input-field" />
              {errors.expense_date && <p className="text-red-500 text-xs mt-1">{errors.expense_date.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category *</label>
            <select {...register("category")} className="input-field">
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Method *</label>
            <select {...register("payment_method")} className="input-field">
              <option value="">Select method</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Note</label>
            <textarea {...register("note")} rows={2} placeholder="Optional note..." className="input-field resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t("cancel")}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? t("saving") : isEdit ? t("update") : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [filterCategory, setFilterCategory] = useState("");
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayStr());

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", dateFrom, dateTo, filterCategory],
    queryFn: () =>
      expensesApi.list({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        category: filterCategory || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const summary = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const count = expenses.length;
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }
    const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return { total, count, topCat };
  }, [expenses]);

  const handleDelete = (id: string) => {
    if (confirm("Delete this expense?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-5">
      {modal.open && (
        <ExpenseModal expense={modal.expense} onClose={() => setModal({ open: false })} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-slate-500 text-sm mt-0.5">{summary.count} entries</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Expenses</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(summary.total)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <List size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Entries</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{summary.count}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <Tag size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Top Category</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {summary.topCat ? categoryLabel(summary.topCat[0]) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-36">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field flex-1" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-36">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field flex-1" />
          </div>
          <div className="flex-1 min-w-36">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field w-full">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-3 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">No expenses found</p>
            <button onClick={() => setModal({ open: true })} className="text-violet-600 text-sm hover:underline mt-1">
              Add your first expense
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Date</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Title</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Category</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Payment</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500">Amount</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 text-sm text-slate-500">{formatDateTime(e.expense_date)}</td>
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-800">{e.title}</p>
                        {e.note && <p className="text-xs text-slate-400 mt-0.5">{e.note}</p>}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_BADGE[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                          {categoryLabel(e.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500 capitalize">{e.payment_method.replace(/_/g, " ")}</td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-800">{formatCurrency(e.amount)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="py-3 px-5 text-sm font-semibold text-slate-600">Total</td>
                    <td className="py-3 px-5 text-right font-bold text-slate-900">{formatCurrency(summary.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {expenses.map((e) => (
                <div key={e.id} className="px-4 py-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{e.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_BADGE[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {categoryLabel(e.category)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(e.expense_date)} · {e.payment_method.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-bold text-slate-800">{formatCurrency(e.amount)}</p>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-t-2 border-slate-200">
                <p className="text-sm font-semibold text-slate-600">Total</p>
                <p className="font-bold text-slate-900">{formatCurrency(summary.total)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
