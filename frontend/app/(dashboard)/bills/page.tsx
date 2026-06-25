"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billsApi } from "@/lib/api";
import { BillListItem } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { ReceiptText, Search, Plus, Download, MessageCircle } from "lucide-react";

const statusClass: Record<string, string> = {
  paid: "badge-paid", pending: "badge-pending",
  partial: "badge-partial",
  cancelled: "bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-semibold",
};

export default function BillsPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: bills = [], isLoading } = useQuery<BillListItem[]>({
    queryKey: ["bills", search, statusFilter],
    queryFn: () => billsApi.list({ search: search || undefined, status: statusFilter || undefined }),
  });

  const statusLabel: Record<string, string> = {
    paid: t("paid"), pending: t("pendingStatus"), partial: t("partial"), cancelled: t("cancelled"),
  };

  const exportCSV = () => {
    const rows = [
      ["Bill No.", "Customer", "Phone", "Date", "Method", "Amount (₹)", "Status"],
      ...bills.map((b) => [
        b.bill_number, b.customer_name || "Walk-in", b.customer_phone || "",
        formatDateTime(b.created_at), b.payment_method,
        Number(b.grand_total).toFixed(2), b.payment_status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vanya-bills-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsApp = (bill: BillListItem) => {
    const text = [
      `*Invoice from BahiKhataDigital*`,
      `Bill No: ${bill.bill_number}`,
      `Amount: ${formatCurrency(bill.grand_total)}`,
      `Status: ${bill.payment_status}`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("bills")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{bills.length} {t("bills").toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          {bills.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> {t("exportCSV")}
            </button>
          )}
          <Link href="/bills/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t("newBill")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchBills")} className="input-field pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto min-w-36 bg-white">
          <option value="">{t("allStatus")}</option>
          <option value="paid">{t("paid")}</option>
          <option value="pending">{t("pendingStatus")}</option>
          <option value="partial">{t("partial")}</option>
          <option value="cancelled">{t("cancelled")}</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-16">
            <ReceiptText className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">{t("noBillsFound")}</p>
            <Link href="/bills/new" className="text-violet-600 text-sm hover:underline mt-1 inline-block">
              {t("createFirstBill")}
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[t("billNo"), t("customer"), t("date"), t("method"), t("amount"), t("status"), ""].map((h, i) => (
                      <th key={`h-${i}`} className={`py-3 px-4 text-xs font-semibold text-slate-500 ${i >= 3 && i < 6 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <Link href={`/bills/${bill.id}`} className="font-semibold text-violet-700 hover:underline text-sm">
                          {bill.bill_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-medium text-slate-800">{bill.customer_name || t("walkin")}</p>
                        {bill.customer_phone && <p className="text-xs text-slate-400">{bill.customer_phone}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-500">{formatDateTime(bill.created_at)}</td>
                      <td className="py-3.5 px-4 text-sm text-slate-600 text-right capitalize">{bill.payment_method}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">{formatCurrency(bill.grand_total)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={statusClass[bill.payment_status] || "badge-pending"}>
                          {statusLabel[bill.payment_status] || bill.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => shareWhatsApp(bill)} title={t("whatsapp")}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition">
                            <MessageCircle size={14} />
                          </button>
                          <Link href={`/bills/${bill.id}`}
                            className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition text-xs font-medium">
                            →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {bills.map((bill) => (
                <Link key={bill.id} href={`/bills/${bill.id}`}
                  className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="font-semibold text-violet-700 text-sm">{bill.bill_number}</p>
                    <p className="text-sm text-slate-700 mt-0.5">{bill.customer_name || t("walkin")}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(bill.created_at)}</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="font-bold text-slate-900">{formatCurrency(bill.grand_total)}</p>
                    <span className={`mt-1 inline-block ${statusClass[bill.payment_status] || "badge-pending"}`}>
                      {statusLabel[bill.payment_status] || bill.payment_status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
