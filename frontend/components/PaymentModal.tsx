"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billsApi } from "@/lib/api";
import { Bill, PaymentLog } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { X, IndianRupee, CheckCircle, History, Info } from "lucide-react";

interface Props {
  bill: Bill;
  onClose: () => void;
}

export default function PaymentModal({ bill, onClose }: Props) {
  const qc = useQueryClient();
  const { t, lang } = useT();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");

  const balance = Number(bill.grand_total) - Number(bill.amount_paid);
  const entered = parseFloat(amount) || 0;
  const excess = Math.max(0, entered - balance);
  const hasCustomer = !!bill.customer_id;

  const methodLabel = (m: string) => {
    const map: Record<string, Record<string, string>> = {
      cash: { en: "Cash", hi: "नकद" },
      upi: { en: "UPI", hi: "UPI" },
      card: { en: "Card", hi: "कार्ड" },
      bank_transfer: { en: "Bank Transfer", hi: "बैंक ट्रांसफर" },
      cheque: { en: "Cheque", hi: "चेक" },
    };
    return map[m]?.[lang] ?? map[m]?.en ?? m;
  };

  const mutation = useMutation({
    mutationFn: () =>
      billsApi.addPayment(bill.id, { amount: entered, method, note: note || undefined }),
    onSuccess: (updated) => {
      qc.setQueryData(["bill", bill.id], updated);
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["customer", bill.customer_id] });
      if (excess > 0 && hasCustomer) {
        toast.success(`${formatCurrency(balance)} received · ${formatCurrency(excess)} added to customer credit`);
      } else {
        toast.success(`${t("recordPayment")}: ${formatCurrency(entered)}`);
      }
      setAmount(""); setNote("");
      if (updated.payment_status === "paid") onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Payment failed";
      toast.error(msg);
    },
  });

  const handlePayFull = () => setAmount(balance.toFixed(2));

  const buttonLabel = () => {
    if (mutation.isPending) return t("recordingPayment");
    if (excess > 0 && hasCustomer) {
      return lang === "hi"
        ? `₹${balance.toFixed(2)} भुगतान + ₹${excess.toFixed(2)} क्रेडिट`
        : `Pay ₹${balance.toFixed(2)} + Credit ₹${excess.toFixed(2)}`;
    }
    return `${t("recordPayment")}: ₹${entered.toFixed(2)}`;
  };

  return (
    /* Mobile: full-screen white page. Desktop: dimmed backdrop + centered modal */
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/40 sm:backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full flex-1 sm:flex-none sm:rounded-2xl sm:max-w-md sm:max-h-[88vh] sm:shadow-2xl overflow-hidden bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-base">{t("recordPayment")}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{bill.bill_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 -mr-1">
            <X size={22} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-4 sm:px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* Balance summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2.5">
              <p className="text-xs text-slate-500 font-medium leading-tight">{t("total")}</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{formatCurrency(bill.grand_total)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2.5">
              <p className="text-xs text-emerald-600 font-medium leading-tight">{t("amountPaid")}</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5 truncate">{formatCurrency(bill.amount_paid)}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${balance > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
              <p className={`text-xs font-medium leading-tight ${balance > 0 ? "text-red-500" : "text-emerald-600"}`}>{t("balanceDue")}</p>
              <p className={`text-sm font-bold mt-0.5 truncate ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          {balance <= 0 ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
              <CheckCircle className="text-emerald-500 shrink-0" size={20} />
              <p className="text-sm font-semibold text-emerald-700">{t("fullyPaid")}</p>
            </div>
          ) : (
            <>
              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {t("paymentAmountLabel")}
                </label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="number" min={0.01} step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`input-field pl-8 text-lg ${excess > 0 ? "border-amber-400 ring-1 ring-amber-300" : ""}`}
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button type="button" onClick={handlePayFull}
                    className="text-sm text-violet-600 hover:text-violet-700 font-semibold">
                    {t("payFullBalance")} ({formatCurrency(balance)})
                  </button>
                  {excess > 0 && (
                    <span className="text-xs text-amber-600 font-medium">
                      +{formatCurrency(excess)} {lang === "hi" ? "अतिरिक्त" : "extra"}
                    </span>
                  )}
                </div>
              </div>

              {/* Overpayment notice */}
              {excess > 0 && (
                <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                  hasCustomer
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <Info size={15} className="shrink-0 mt-0.5" />
                  <div>
                    {hasCustomer ? (
                      <>
                        <p className="font-semibold">
                          {lang === "hi"
                            ? `₹${excess.toFixed(2)} ग्राहक के क्रेडिट में जाएगा`
                            : `₹${excess.toFixed(2)} will be added to customer's credit balance`}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                          {lang === "hi"
                            ? "अगले बिल में इस क्रेडिट का उपयोग किया जा सकता है"
                            : "This credit can be applied to their next bill"}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold">
                        {lang === "hi"
                          ? "क्रेडिट सहेजने के लिए बिल में ग्राहक लिंक करें"
                          : "Link a customer to this bill to save excess as credit"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {t("paymentMethodLabel")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["cash", "upi", "card", "bank_transfer", "cheque"].map((val) => (
                    <button key={val} type="button" onClick={() => setMethod(val)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition ${
                        method === val
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                      }`}>
                      {methodLabel(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {t("noteOptional")}
                </label>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={lang === "hi" ? "जैसे: हाथ में नकद मिला" : "e.g. Cash received in hand"}
                  className="input-field" />
              </div>

              {/* Submit — sticky on mobile */}
              <div className="sticky bottom-0 pb-2 sm:pb-0 bg-white sm:bg-transparent pt-1">
                <button
                  onClick={() => {
                    if (!amount || entered <= 0) {
                      toast.error(t("enterValidAmount")); return;
                    }
                    mutation.mutate();
                  }}
                  disabled={mutation.isPending || !amount}
                  className="btn-primary w-full py-3 text-base"
                >
                  {buttonLabel()}
                </button>
              </div>
            </>
          )}

          {/* Payment History */}
          {bill.payment_logs && bill.payment_logs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <History size={12} /> {t("paymentHistory")}
              </p>
              <div className="space-y-2">
                {bill.payment_logs.map((log: PaymentLog) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(log.amount)}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {methodLabel(log.method)}
                        {log.note ? ` · ${log.note}` : ""}
                        {" · "}{formatDateTime(log.created_at)}
                      </p>
                    </div>
                    <CheckCircle size={14} className="text-emerald-500 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
