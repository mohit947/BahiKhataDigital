"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billsApi } from "@/lib/api";
import { Bill } from "@/lib/types";
import BillPrint from "@/components/BillPrint";
import PaymentModal from "@/components/PaymentModal";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Printer, Download, Share2, IndianRupee,
  Copy, XCircle, MessageCircle, History, CheckCircle, AlertCircle, Wallet,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const statusClass: Record<string, string> = {
  paid: "badge-paid", pending: "badge-pending",
  partial: "badge-partial", cancelled: "bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-semibold",
};

export default function BillDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, lang } = useT();

  const methodLabel = (m: string) => {
    const map: Record<string, Record<string, string>> = {
      cash: { en: "Cash", hi: "नकद" }, upi: { en: "UPI", hi: "UPI" },
      card: { en: "Card", hi: "कार्ड" }, bank_transfer: { en: "Bank Transfer", hi: "बैंक ट्रांसफर" },
      cheque: { en: "Cheque", hi: "चेक" },
    };
    return map[m]?.[lang] ?? map[m]?.en ?? m;
  };
  const printRef = useRef<HTMLDivElement>(null);
  const [showPayment, setShowPayment] = useState(false);

  const { data: bill, isLoading } = useQuery<Bill>({
    queryKey: ["bill", params.id],
    queryFn: () => billsApi.get(params.id),
  });

  const { data: qrData } = useQuery({
    queryKey: ["bill-qr", params.id],
    queryFn: () => billsApi.qrData(params.id),
    enabled: !!bill && bill.payment_status !== "cancelled",
  });

  const applyCreditMutation = useMutation({
    mutationFn: () => billsApi.applyCredit(params.id),
    onSuccess: (updated) => {
      qc.setQueryData(["bill", params.id], updated);
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["customer", bill?.customer_id] });
      toast.success(lang === "hi" ? "क्रेडिट लागू किया गया" : "Credit applied successfully");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to apply credit";
      toast.error(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => billsApi.cancel(params.id),
    onSuccess: (updated) => {
      qc.setQueryData(["bill", params.id], updated);
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(t("cancelled"));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to cancel";
      toast.error(msg);
    },
  });

  const handleDuplicate = () => router.push(`/bills/new?from=${params.id}`);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: bill ? `Invoice-${bill.bill_number}` : "Invoice",
  });

  const handleShare = async () => {
    if (!bill) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Invoice ${bill.bill_number}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(lang === "hi" ? "लिंक कॉपी हो गया" : "Link copied to clipboard");
      }
    } catch { toast.error(lang === "hi" ? "शेयर विफल" : "Share failed"); }
  };

  const handleWhatsApp = () => {
    if (!bill) return;
    const balance = Number(bill.grand_total) - Number(bill.amount_paid);
    const text = [
      `*Invoice from BahiKhataDigital*`,
      `Bill No: ${bill.bill_number}`,
      `Amount: ${formatCurrency(bill.grand_total)}`,
      balance > 0 ? `Balance Due: ${formatCurrency(balance)}` : `Status: ✅ Fully Paid`,
      `\nPlease make payment at your earliest convenience.`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCancel = () => {
    if (!confirm(t("cancelConfirm"))) return;
    cancelMutation.mutate();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!bill) return (
    <div className="text-center py-16">
      <p className="text-slate-400">Bill not found.</p>
      <Link href="/bills" className="text-violet-600 hover:underline mt-2 inline-block">← All Bills</Link>
    </div>
  );

  const balance = Number(bill.grand_total) - Number(bill.amount_paid);
  const isCancelled = bill.payment_status === "cancelled";
  const isPaid = bill.payment_status === "paid";

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/bills" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition">
          <ArrowLeft size={16} /> {t("allBills")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleWhatsApp} className="btn-secondary flex items-center gap-2 text-green-700 border-green-200 hover:bg-green-50">
            <MessageCircle size={15} /> {t("whatsapp")}
          </button>
          <button onClick={handleShare} className="btn-secondary flex items-center gap-2">
            <Share2 size={15} /> {t("share")}
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <Download size={15} /> {t("savePDF")}
          </button>
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={15} /> {t("print")}
          </button>
        </div>
      </div>

      {/* Bill summary + actions */}
      <div className="card p-5 no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium">{t("billNumber")}</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{bill.bill_number}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(bill.created_at)}</p>
          </div>
          {bill.customer_name && (
            <div>
              <p className="text-xs text-slate-400">{t("customer")}</p>
              <p className="font-semibold text-slate-800 mt-0.5">{bill.customer_name}</p>
              {bill.customer_phone && <p className="text-xs text-slate-400">{bill.customer_phone}</p>}
              {bill.customer && (
                <Link href={`/customers/${bill.customer.id}`} className="text-xs text-violet-600 hover:underline mt-0.5 inline-block">
                  {t("viewProfile")}
                </Link>
              )}
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-slate-400">{t("grandTotal")}</p>
            <p className="text-2xl font-bold text-violet-700 mt-0.5">{formatCurrency(bill.grand_total)}</p>
            <span className={statusClass[bill.payment_status] || "badge-pending"}>
              {bill.payment_status}
            </span>
          </div>
        </div>

        {/* Payment summary bar */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium">{t("totalBilled")}</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(bill.grand_total)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-600 font-medium">{t("amountPaid")}</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(bill.amount_paid)}</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${balance > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
            <p className={`text-xs font-medium ${balance > 0 ? "text-red-500" : "text-emerald-600"}`}>{t("balanceDue")}</p>
            <p className={`text-lg font-bold mt-1 ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {!isCancelled && (
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
            {!isPaid && (
              <button onClick={() => setShowPayment(true)}
                className="btn-primary flex items-center gap-2">
                <IndianRupee size={15} /> {t("recordPayment")}
              </button>
            )}
            <button onClick={handleDuplicate}
              className="btn-secondary flex items-center gap-2">
              <Copy size={15} /> {t("duplicateBill")}
            </button>
            {!isPaid && (
              <button onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="btn-secondary flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <XCircle size={15} /> {cancelMutation.isPending ? t("cancellingBill") : t("cancelBill")}
              </button>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <AlertCircle size={15} className="text-slate-400 shrink-0" />
            <p className="text-sm text-slate-500">{t("cancelledMsg")}</p>
            <button onClick={handleDuplicate}
              className="ml-auto btn-secondary text-xs flex items-center gap-1">
              <Copy size={13} /> {t("recreateBill")}
            </button>
          </div>
        )}
      </div>

      {/* Credit available banner */}
      {bill.customer && Number(bill.customer.credit_balance) > 0 && !isPaid && !isCancelled && (
        <div className="card p-4 no-print flex items-center gap-3 border-violet-200 bg-violet-50">
          <Wallet size={16} className="text-violet-600 shrink-0" />
          <p className="text-sm text-violet-800">
            {lang === "hi"
              ? `${bill.customer.name} के पास ${formatCurrency(bill.customer.credit_balance)} क्रेडिट उपलब्ध है`
              : `${bill.customer.name} has ${formatCurrency(bill.customer.credit_balance)} credit available`}
          </p>
          <button
            onClick={() => {
              if (!confirm(
                lang === "hi"
                  ? `${formatCurrency(Math.min(Number(bill.customer!.credit_balance), balance))} क्रेडिट लागू करें?`
                  : `Apply ${formatCurrency(Math.min(Number(bill.customer!.credit_balance), balance))} credit to this bill?`
              )) return;
              applyCreditMutation.mutate();
            }}
            disabled={applyCreditMutation.isPending}
            className="ml-auto btn-primary text-sm py-1.5 px-4 flex items-center gap-2"
          >
            <Wallet size={13} />
            {applyCreditMutation.isPending
              ? (lang === "hi" ? "लागू हो रहा है..." : "Applying...")
              : (lang === "hi" ? "क्रेडिट लगाएं" : "Apply Credit")}
          </button>
        </div>
      )}

      {/* Payment History */}
      {bill.payment_logs && bill.payment_logs.length > 0 && (
        <div className="card p-5 no-print">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <History size={16} className="text-violet-500" /> {t("paymentHistory")}
          </h3>
          <div className="space-y-2">
            {bill.payment_logs.map((log) => (
              <div key={log.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle size={14} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(log.amount)}</p>
                    <p className="text-xs text-slate-400">
                      {methodLabel(log.method)}
                      {log.note ? ` · ${log.note}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Running total */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500 font-medium">{t("totalCollected")}</span>
            <span className="font-bold text-emerald-700">{formatCurrency(bill.amount_paid)}</span>
          </div>
        </div>
      )}

      {/* Invoice preview */}
      <div className="no-print">
        <p className="text-xs text-slate-400 text-center mb-3">{t("invoicePreview")}</p>
        <div className="bg-slate-200 rounded-xl p-4 overflow-x-auto">
          <div className="shadow-xl mx-auto w-fit">
            <BillPrint ref={printRef} bill={bill} upiLink={qrData?.upi_link} />
          </div>
        </div>
      </div>

      {/* Hidden actual print target */}
      <div className="print-only">
        <BillPrint ref={printRef} bill={bill} upiLink={qrData?.upi_link} />
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          bill={bill}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
