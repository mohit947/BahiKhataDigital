"use client";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { CustomerWithBills } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, MapPin, ReceiptText } from "lucide-react";
import Link from "next/link";

const statusClass: Record<string, string> = {
  paid: "badge-paid", pending: "badge-pending", partial: "badge-partial",
};

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { data: customer, isLoading } = useQuery<CustomerWithBills>({
    queryKey: ["customer", params.id],
    queryFn: () => customersApi.get(params.id),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!customer) return (
    <div className="text-center py-16">
      <p className="text-slate-400">Customer not found.</p>
      <Link href="/customers" className="text-violet-600 hover:underline mt-2 inline-block">← Back</Link>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition">
          <ArrowLeft size={16} /> Customers
        </Link>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-violet-700 text-2xl font-bold">{customer.name[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2">
              {customer.phone && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600"><Phone size={14} className="text-slate-400" />{customer.phone}</span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600"><Mail size={14} className="text-slate-400" />{customer.email}</span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={14} className="text-slate-400" />{customer.address}</span>
              )}
            </div>
            {customer.gstin && (
              <p className="text-xs text-slate-400 mt-1 font-mono">GSTIN: {customer.gstin}</p>
            )}
          </div>
          {/* Stats */}
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{customer.total_bills}</p>
              <p className="text-xs text-slate-400">Total Bills</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-700">{formatCurrency(customer.total_spent)}</p>
              <p className="text-xs text-slate-400">Total Spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bills History */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ReceiptText size={16} className="text-slate-400" /> Bill History
          </h2>
          <Link href={`/bills/new`} className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition">
            + New Bill
          </Link>
        </div>

        {customer.bills.length === 0 ? (
          <div className="text-center py-12">
            <ReceiptText className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-slate-400 text-sm">No bills for this customer yet</p>
          </div>
        ) : (
          <div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Bill No.</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Date</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Method</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500">Amount</th>
                    <th className="text-center py-3 px-5 text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.bills.map((bill) => (
                    <tr key={bill.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5">
                        <Link href={`/bills/${bill.id}`} className="font-semibold text-violet-700 hover:underline text-sm">
                          {bill.bill_number}
                        </Link>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-500">{formatDateTime(bill.created_at)}</td>
                      <td className="py-3 px-5 text-sm text-slate-600 capitalize">{bill.payment_method}</td>
                      <td className="py-3 px-5 text-right font-bold text-slate-900 text-sm">{formatCurrency(bill.grand_total)}</td>
                      <td className="py-3 px-5 text-center">
                        <span className={statusClass[bill.payment_status] || "badge-pending"}>
                          {bill.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {customer.bills.map((bill) => (
                <Link key={bill.id} href={`/bills/${bill.id}`} className="block px-4 py-4 hover:bg-slate-50 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-violet-700 text-sm">{bill.bill_number}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(bill.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(bill.grand_total)}</p>
                      <span className={statusClass[bill.payment_status] || "badge-pending"}>{bill.payment_status}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
