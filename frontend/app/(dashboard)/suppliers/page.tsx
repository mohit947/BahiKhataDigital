"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi } from "@/lib/api";
import { Supplier } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit, Truck, X, Phone, Mail } from "lucide-react";
import { useT } from "@/lib/i18n";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gstin: z.string().optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function SupplierModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useT();
  const isEdit = !!supplier;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          gstin: supplier.gstin ?? "",
          contact_person: supplier.contact_person ?? "",
          notes: supplier.notes ?? "",
          is_active: supplier.is_active,
        }
      : { is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? suppliersApi.update(supplier!.id, data) : suppliersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(isEdit ? "Supplier updated" : "Supplier added");
      onClose();
    },
    onError: () => toast.error("Failed to save supplier"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? "Edit Supplier" : "Add Supplier"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
            <input {...register("name")} placeholder="Supplier name" className="input-field" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Person</label>
            <input {...register("contact_person")} placeholder="Contact person name" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("phone")}</label>
              <input {...register("phone")} placeholder="+91-XXXXXXXXXX" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input {...register("email")} placeholder="email@example.com" className="input-field" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("address")}</label>
            <textarea {...register("address")} rows={2} placeholder={t("address")} className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("gstin")}</label>
            <input {...register("gstin")} placeholder="Optional" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea {...register("notes")} rows={2} placeholder="Any notes..." className="input-field resize-none" />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_active")} id="is_active_supplier" className="w-4 h-4 accent-violet-600" />
              <label htmlFor="is_active_supplier" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t("cancel")}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? t("saving") : isEdit ? t("update") : "Add Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; supplier?: Supplier }>({ open: false });

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", search],
    queryFn: () => suppliersApi.list({ search: search || undefined }),
  });

  return (
    <div className="space-y-5">
      {modal.open && (
        <SupplierModal supplier={modal.supplier} onClose={() => setModal({ open: false })} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} suppliers</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-3 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">No suppliers yet</p>
            <button onClick={() => setModal({ open: true })} className="text-violet-600 text-sm hover:underline mt-1">
              Add your first supplier
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Supplier</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Contact Person</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Phone / Email</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">{t("gstin")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">{t("since")}</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                            <Truck size={15} className="text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{s.name}</p>
                            {s.address && <p className="text-xs text-slate-400 truncate max-w-xs">{s.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-600">{s.contact_person || "—"}</td>
                      <td className="py-3.5 px-5">
                        {s.phone && <p className="text-sm text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{s.phone}</p>}
                        {s.email && <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail size={11} className="text-slate-400" />{s.email}</p>}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500 font-mono">{s.gstin || "—"}</td>
                      <td className="py-3.5 px-5">
                        {s.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inactive</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-400">{formatDateTime(s.created_at)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setModal({ open: true, supplier: s })}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                        >
                          <Edit size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {suppliers.map((s) => (
                <div key={s.id} className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <Truck size={16} className="text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.contact_person || s.phone || s.email || "No contact"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {s.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inactive</span>
                    )}
                    <button
                      onClick={() => setModal({ open: true, supplier: s })}
                      className="p-2 text-slate-400 hover:text-violet-600 transition"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
