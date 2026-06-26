"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { billsApi } from "@/lib/api";
import { Product, BillItemDraft, Customer, BillItem } from "@/lib/types";
import { computeLineItem, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import ProductSearch from "./ProductSearch";
import CustomerSearch from "./CustomerSearch";
import { Plus, Trash2, User } from "lucide-react";

const schema = z.object({
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  customer_gstin: z.string().optional(),
  payment_method: z.string().default("cash"),
  payment_status: z.string().default("pending"),
  amount_paid: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const newRow = (): BillItemDraft => ({
  product_name: "", unit: "pcs", quantity: 1, rate: 0,
  discount_percent: 0, gst_percent: 0, discount_amount: 0, gst_amount: 0, total: 0,
});

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>;
}

interface Props {
  fromBillId?: string;
}

export default function BillForm({ fromBillId }: Props) {
  const router = useRouter();
  const { t, lang } = useT();
  const [items, setItems] = useState<BillItemDraft[]>([newRow()]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_method: "cash", payment_status: "pending", amount_paid: 0 },
  });

  const { data: templateBill } = useQuery({
    queryKey: ["bill", fromBillId],
    queryFn: () => billsApi.get(fromBillId!),
    enabled: !!fromBillId,
  });

  useEffect(() => {
    if (!templateBill) return;
    setValue("customer_name", templateBill.customer_name || "");
    setValue("customer_phone", templateBill.customer_phone || "");
    setValue("customer_address", templateBill.customer_address || "");
    setValue("customer_gstin", templateBill.customer_gstin || "");
    setValue("payment_method", templateBill.payment_method);
    setValue("notes", templateBill.notes || "");
    setValue("payment_status", "pending");
    setValue("amount_paid", 0);
    setItems(templateBill.items.map((item: BillItem) => recompute({
      product_id: item.product_id,
      product_name: item.product_name,
      unit: item.unit,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      discount_percent: Number(item.discount_percent),
      gst_percent: Number(item.gst_percent),
      discount_amount: 0, gst_amount: 0, total: 0,
    })));
    if (templateBill.customer) {
      setSelectedCustomer(templateBill.customer);
    }
  }, [templateBill, setValue]);

  const mutation = useMutation({
    mutationFn: billsApi.create,
    onSuccess: (bill) => {
      toast.success(`${t("createBill")}: ${bill.bill_number}`);
      router.push(`/bills/${bill.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create bill";
      toast.error(msg);
    },
  });

  const recompute = (d: BillItemDraft): BillItemDraft => {
    const { discountAmount, gstAmount, total } = computeLineItem(d.quantity, d.rate, d.discount_percent, d.gst_percent);
    return { ...d, discount_amount: discountAmount, gst_amount: gstAmount, total };
  };

  const updateItem = (idx: number, partial: Partial<BillItemDraft>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = recompute({ ...next[idx], ...partial });
      return next;
    });
  };

  const addFromProduct = (product: Product) => {
    const draft = recompute({
      product_id: product.id, product_name: product.name, unit: product.unit,
      quantity: 1, rate: product.rate, discount_percent: 0,
      gst_percent: product.gst_rate, discount_amount: 0, gst_amount: 0, total: 0,
    });
    setItems((prev) => {
      if (prev.length > 0 && !prev[prev.length - 1].product_name) {
        const next = [...prev]; next[next.length - 1] = draft; return next;
      }
      return [...prev, draft];
    });
  };

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setValue("customer_name", customer.name);
      setValue("customer_phone", customer.phone || "");
      setValue("customer_address", customer.address || "");
      setValue("customer_gstin", customer.gstin || "");
    }
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const discountTotal = items.reduce((s, i) => s + i.discount_amount, 0);
  const gstTotal = items.reduce((s, i) => s + i.gst_amount, 0);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  const onSubmit = (data: FormData) => {
    const validItems = items.filter((i) => i.product_name && i.rate > 0);
    if (validItems.length === 0) { toast.error(t("addAtLeastOne")); return; }
    mutation.mutate({
      ...data,
      customer_id: selectedCustomer?.id,
      items: validItems.map((i) => ({
        product_id: i.product_id, product_name: i.product_name, unit: i.unit,
        quantity: i.quantity, rate: i.rate, discount_percent: i.discount_percent,
        gst_percent: i.gst_percent,
      })),
    });
  };

  const methodOptions = [
    { value: "cash", label: lang === "hi" ? "नकद" : "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: lang === "hi" ? "कार्ड" : "Card" },
    { value: "bank_transfer", label: lang === "hi" ? "बैंक ट्रांसफर" : "Bank Transfer" },
    { value: "cheque", label: lang === "hi" ? "चेक" : "Cheque" },
  ];

  const statusOptions = [
    { value: "pending", label: t("pendingStatus") },
    { value: "partial", label: t("partial") },
    { value: "paid", label: t("paid") },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Customer */}
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><User size={14} /> {t("customer")}</h2>

        <div className="mb-4">
          <Label>{t("selectExistingCustomer")}</Label>
          <CustomerSearch selected={selectedCustomer} onSelect={handleCustomerSelect} />
        </div>

        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">{t("orFillManually")}</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>{t("name")}</Label>
            <input {...register("customer_name")} placeholder={lang === "hi" ? "ग्राहक का नाम" : "Customer name"} className="input-field" />
          </div>
          <div>
            <Label>{t("phone")}</Label>
            <input {...register("customer_phone")} placeholder="+91-XXXXXXXXXX" className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("address")}</Label>
            <textarea {...register("customer_address")} rows={2} placeholder={lang === "hi" ? "ग्राहक का पता" : "Customer address"} className="input-field resize-none" />
          </div>
          <div>
            <Label>{t("gstin")}</Label>
            <input {...register("customer_gstin")} placeholder={lang === "hi" ? "वैकल्पिक" : "Optional"} className="input-field" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{t("billItems")}</h2>
          <button type="button" onClick={() => setItems((p) => [...p, newRow()])}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition">
            <Plus size={14} /> {t("addRow")}
          </button>
        </div>

        <div className="mb-4">
          <ProductSearch onSelect={addFromProduct} />
        </div>

        <p className="text-xs text-slate-400 mb-2 sm:hidden">← Scroll right to see all columns</p>
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">{t("product")}</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">{t("unit")}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">{t("qty")}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-28">{t("rate")}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">{t("discPct")}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">{t("gstPct")}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-28">{t("amount")}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={`border-t border-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                  <td className="px-3 py-2 text-xs text-slate-400 font-medium">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input value={item.product_name}
                      onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                      placeholder={lang === "hi" ? "उत्पाद नाम" : "Product name"}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-400 outline-none bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-400 outline-none text-center bg-white" />
                  </td>
                  {[
                    { key: "quantity", align: "right" },
                    { key: "rate", align: "right" },
                    { key: "discount_percent", align: "right" },
                    { key: "gst_percent", align: "right" },
                  ].map(({ key, align }) => (
                    <td key={key} className="px-2 py-1.5">
                      <input type="number" min={0} step="any"
                        value={item[key as keyof BillItemDraft] as number}
                        onChange={(e) => updateItem(idx, { [key]: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-400 outline-none bg-white text-${align}`} />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 text-sm whitespace-nowrap">
                    ₹{item.total.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{t("subtotal")}</span><span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{t("discount")}</span><span className="font-medium">–{formatCurrency(discountTotal)}</span>
              </div>
            )}
            {gstTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>{t("gst")}</span><span className="font-medium">+{formatCurrency(gstTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-200 pt-2 mt-2">
              <span>{t("grandTotal")}</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="card p-5">
        <h2 className="section-title mb-4">{t("payment")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>{t("paymentMethod")}</Label>
            <select {...register("payment_method")} className="input-field bg-white">
              {methodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label>{t("paymentStatus")}</Label>
            <select {...register("payment_status")} className="input-field bg-white">
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label>{t("amountPaidLabel")}</Label>
            <input type="number" min={0} step="any" {...register("amount_paid")} className="input-field" />
          </div>
          <div className="sm:col-span-3">
            <Label>{t("notes")}</Label>
            <textarea {...register("notes")} rows={2}
              placeholder={lang === "hi" ? "वैकल्पिक नोट्स…" : "Optional notes…"}
              className="input-field resize-none" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pb-4">
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">{t("cancel")}</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full sm:w-auto sm:min-w-32">
          {mutation.isPending ? t("creating") : t("createBill")}
        </button>
      </div>
    </form>
  );
}
