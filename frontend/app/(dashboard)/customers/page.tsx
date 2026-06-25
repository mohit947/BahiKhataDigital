"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { Customer } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit, Users, X, Phone, Mail } from "lucide-react";
import { useT } from "@/lib/i18n";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  gstin: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useT();
  const isEdit = !!customer;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer || {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? customersApi.update(customer!.id, data) : customersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(isEdit ? "Customer updated" : "Customer added");
      onClose();
    },
    onError: () => toast.error("Failed to save customer"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? t("editCustomer") : t("addCustomer")}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("nameRequired")}</label>
            <input {...register("name")} placeholder={t("name")} className="input-field" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("phone")}</label>
              <input {...register("phone")} placeholder="+91-XXXXXXXXXX" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input {...register("email")} placeholder="email@example.com" className="input-field" />
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
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t("cancel")}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? t("saving") : isEdit ? t("update") : t("addCustomer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; customer?: Customer }>({ open: false });

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", search],
    queryFn: () => customersApi.list({ search: search || undefined }),
  });

  return (
    <div className="space-y-5">
      {modal.open && (
        <CustomerModal customer={modal.customer} onClose={() => setModal({ open: false })} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("customers")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} {t("customers").toLowerCase()}</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("addCustomer")}
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCustomers")}
            className="input-field pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-3 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">{t("noCustomersYet")}</p>
            <button onClick={() => setModal({ open: true })} className="text-violet-600 text-sm hover:underline mt-1">
              {t("addFirstCustomer")}
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">{t("customer")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">{t("contact")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">{t("gstin")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">{t("since")}</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-violet-700 text-sm font-bold">{c.name[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">{c.name}</p>
                            {c.address && <p className="text-xs text-slate-400 truncate max-w-xs">{c.address}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-5">
                        {c.phone && <p className="text-sm text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{c.phone}</p>}
                        {c.email && <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail size={11} className="text-slate-400" />{c.email}</p>}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500 font-mono">{c.gstin || "—"}</td>
                      <td className="py-3.5 px-5 text-sm text-slate-400">{formatDateTime(c.created_at)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button onClick={() => setModal({ open: true, customer: c })}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
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
              {customers.map((c) => (
                <div key={c.id} className="px-4 py-4 flex items-center justify-between">
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-violet-700 font-bold">{c.name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone || c.email || "No contact"}</p>
                    </div>
                  </Link>
                  <button onClick={() => setModal({ open: true, customer: c })}
                    className="p-2 text-slate-400 hover:text-violet-600 transition ml-2">
                    <Edit size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
