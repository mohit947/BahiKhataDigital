"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "@/lib/api";
import { StaffMember } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit, UserCog, X, Phone, Mail } from "lucide-react";
import { useT } from "@/lib/i18n";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.string().optional(),
  salary: z.string().optional(),
  join_date: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function StaffModal({ member, onClose }: { member?: StaffMember; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useT();
  const isEdit = !!member;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: member
      ? {
          name: member.name,
          phone: member.phone ?? "",
          email: member.email ?? "",
          role: member.role ?? "",
          salary: member.salary != null ? String(member.salary) : "",
          join_date: member.join_date ?? "",
          notes: member.notes ?? "",
          is_active: member.is_active,
        }
      : { is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        salary: data.salary ? parseFloat(data.salary) : undefined,
      };
      return isEdit ? staffApi.update(member!.id, payload) : staffApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success(isEdit ? "Staff member updated" : "Staff member added");
      onClose();
    },
    onError: () => toast.error("Failed to save staff member"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-900">{isEdit ? "Edit Staff Member" : "Add Staff Member"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
            <input {...register("name")} placeholder="Full name" className="input-field" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
            <input {...register("role")} placeholder="e.g. Manager, Cashier, Accountant" className="input-field" />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Monthly Salary (₹)</label>
              <input type="number" min="0" step="0.01" {...register("salary")} placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Join Date</label>
              <input type="date" {...register("join_date")} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea {...register("notes")} rows={2} placeholder="Any notes..." className="input-field resize-none" />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_active")} id="is_active_staff" className="w-4 h-4 accent-violet-600" />
              <label htmlFor="is_active_staff" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">{t("cancel")}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full sm:w-auto">
              {mutation.isPending ? t("saving") : isEdit ? t("update") : "Add Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; member?: StaffMember }>({ open: false });

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff", search],
    queryFn: () => staffApi.list({ search: search || undefined }),
  });

  return (
    <div className="space-y-5">
      {modal.open && (
        <StaffModal member={modal.member} onClose={() => setModal({ open: false })} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="text-slate-500 text-sm mt-0.5">{staff.length} staff members</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-3 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">No staff members yet</p>
            <button onClick={() => setModal({ open: true })} className="text-violet-600 text-sm hover:underline mt-1">
              Add your first staff member
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Name</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Role</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Phone / Email</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Monthly Salary</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Join Date</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-indigo-700 text-sm font-bold">{m.name[0].toUpperCase()}</span>
                          </div>
                          <p className="font-semibold text-slate-800">{m.name}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-600">{m.role || "—"}</td>
                      <td className="py-3.5 px-5">
                        {m.phone && <p className="text-sm text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{m.phone}</p>}
                        {m.email && <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail size={11} className="text-slate-400" />{m.email}</p>}
                      </td>
                      <td className="py-3.5 px-5 text-sm font-semibold text-slate-700">
                        {m.salary != null ? formatCurrency(m.salary) : "—"}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-400">
                        {m.join_date ? formatDateTime(m.join_date) : "—"}
                      </td>
                      <td className="py-3.5 px-5">
                        {m.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inactive</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setModal({ open: true, member: m })}
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
              {staff.map((m) => (
                <div key={m.id} className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-indigo-700 font-bold">{m.name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.role || m.phone || "No info"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {m.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inactive</span>
                    )}
                    <button
                      onClick={() => setModal({ open: true, member: m })}
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
