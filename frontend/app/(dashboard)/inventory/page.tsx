"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Package, X, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().default("pcs"),
  rate: z.coerce.number().min(0),
  gst_rate: z.coerce.number().min(0).max(100).default(0),
  category: z.string().optional(),
  hsn_code: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const UNITS = ["pcs", "kg", "g", "litre", "ml", "metre", "feet", "box", "bag", "dozen", "pair", "set", "ream"];
const GST_RATES = [0, 5, 12, 18, 28];

function ProductModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useT();
  const isEdit = !!product;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? { ...product, rate: Number(product.rate), gst_rate: Number(product.gst_rate) }
      : { unit: "pcs", gst_rate: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? productsApi.update(product!.id, data) : productsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(isEdit ? "Product updated" : "Product added");
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-900">{isEdit ? t("editProduct") : t("addProduct")}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("productName")}</label>
              <input {...register("name")} placeholder="e.g. A4 Paper Ream" className="input-field" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("sku")}</label>
              <input {...register("sku")} placeholder="e.g. A4-500" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("category")}</label>
              <input {...register("category")} placeholder="e.g. Stationery" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("unit")} *</label>
              <select {...register("unit")} className="input-field bg-white">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("rate")} *</label>
              <input type="number" min={0} step="any" {...register("rate")} placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("gstRate")}</label>
              <select {...register("gst_rate")} className="input-field bg-white">
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("hsnCode")}</label>
              <input {...register("hsn_code")} placeholder="e.g. 48209090" className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("description")}</label>
              <textarea {...register("description")} rows={2} placeholder="Optional" className="input-field resize-none" />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">{t("cancel")}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full sm:w-auto">
              {mutation.isPending ? t("saving") : isEdit ? t("update") : t("addProduct")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products", search],
    queryFn: () => productsApi.list({ search: search || undefined, active_only: false }),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deactivated"); },
    onError: () => toast.error("Failed to deactivate"),
  });

  return (
    <div className="space-y-5">
      {modal.open && <ProductModal product={modal.product} onClose={() => setModal({ open: false })} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{t("inventory")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{products.length} {t("inventory").toLowerCase()}</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus size={16} /> {t("addProduct")}
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchInventory")} className="input-field pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">{t("noProductsYet")}</p>
            <button onClick={() => setModal({ open: true })} className="text-violet-600 text-sm hover:underline mt-1">
              {t("addFirstProduct")}
            </button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[t("product"), t("sku"), t("category"), t("unit"), t("rate"), "GST", t("active"), ""].map((h, i) => (
                      <th key={i} className={`py-3 px-5 text-xs font-semibold text-slate-500 ${i >= 4 ? "text-right" : "text-left"} ${i === 6 ? "text-center" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${!p.is_active ? "opacity-40" : ""}`}>
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                        {p.description && <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500 font-mono">{p.sku || "—"}</td>
                      <td className="py-3.5 px-5">
                        {p.category
                          ? <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">{p.category}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-600">{p.unit}</td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-900 text-sm">{formatCurrency(p.rate)}</td>
                      <td className="py-3.5 px-5 text-right text-sm text-slate-500">{p.gst_rate}%</td>
                      <td className="py-3.5 px-5 text-center">
                        {p.is_active
                          ? <Check size={15} className="mx-auto text-emerald-500" />
                          : <X size={15} className="mx-auto text-red-400" />}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setModal({ open: true, product: p })}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                            <Edit size={14} />
                          </button>
                          {p.is_active && (
                            <button onClick={() => { if (confirm(`Deactivate "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {products.map((p) => (
                <div key={p.id} className={`px-4 py-4 ${!p.is_active ? "opacity-40" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      {p.sku && <p className="text-xs text-slate-400 font-mono">SKU: {p.sku}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {p.category && <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{p.category}</span>}
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.unit}</span>
                        {Number(p.gst_rate) > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">GST {p.gst_rate}%</span>}
                      </div>
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <p className="font-bold text-violet-700">{formatCurrency(p.rate)}</p>
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setModal({ open: true, product: p })} className="p-1.5 text-slate-400 hover:text-violet-600 transition"><Edit size={15} /></button>
                        {p.is_active && <button onClick={() => { if (confirm(`Deactivate "${p.name}"?`)) deleteMutation.mutate(p.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition"><Trash2 size={15} /></button>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
