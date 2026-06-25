"use client";
import { useQuery } from "@tanstack/react-query";
import { billsApi } from "@/lib/api";
import { DashboardStats, BillListItem } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { TrendingUp, Clock, IndianRupee, ReceiptText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

const statusClass: Record<string, string> = {
  paid: "badge-paid", pending: "badge-pending", partial: "badge-partial",
};

export default function DashboardPage() {
  const { t } = useT();
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    const user = getUser();
    setOrgName(user?.organization?.name || "");
  }, []);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["stats"],
    queryFn: billsApi.stats,
    refetchInterval: 60_000,
  });

  const { data: bills = [] } = useQuery<BillListItem[]>({
    queryKey: ["bills"],
    queryFn: () => billsApi.list({}),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("dashboard")}</h1>
          <p className="text-slate-500 text-sm mt-0.5" suppressHydrationWarning>
            {t("welcomeBack")}{orgName ? ` to ${orgName}` : ""}
          </p>
        </div>
        <Link href="/bills/new" className="btn-primary flex items-center gap-2">
          <ReceiptText size={16} /> {t("newBill")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t("totalRevenue")} icon={IndianRupee} color="bg-violet-500"
          value={formatCurrency(stats?.total_revenue || 0)}
          sub={`${stats?.total_bills || 0} ${t("totalBills").toLowerCase()}`}
        />
        <StatCard
          title={t("todayRevenue")} icon={TrendingUp} color="bg-emerald-500"
          value={formatCurrency(stats?.revenue_today || 0)}
          sub={`${stats?.bills_today || 0} ${t("todayBills")}`}
        />
        <StatCard
          title={t("pendingAmount")} icon={Clock} color="bg-amber-500"
          value={formatCurrency(stats?.pending_amount || 0)}
          sub={t("unpaidPartial")}
        />
        <StatCard
          title={t("totalBills")} icon={ReceiptText} color="bg-blue-500"
          value={String(stats?.total_bills || 0)}
          sub={`${stats?.bills_today || 0} ${t("todayBills")}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Bills */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">{t("recentBills")}</h2>
            <Link href="/bills" className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium">
              {t("viewAll")} <ArrowRight size={13} />
            </Link>
          </div>
          <div>
            {bills.slice(0, 8).map((bill) => (
              <Link key={bill.id} href={`/bills/${bill.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{bill.bill_number}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {bill.customer_name || t("walkin")} · {formatDateTime(bill.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(bill.grand_total)}</p>
                  <span className={statusClass[bill.payment_status] || "badge-pending"}>
                    {bill.payment_status}
                  </span>
                </div>
              </Link>
            ))}
            {bills.length === 0 && (
              <div className="px-5 py-10 text-center">
                <ReceiptText className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400 text-sm">{t("noBillsYet")}</p>
                <Link href="/bills/new" className="text-violet-600 text-sm hover:underline mt-1 inline-block">
                  {t("createFirstBill")}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">{t("topProducts")}</h2>
          </div>
          <div className="p-5 space-y-3">
            {(stats?.top_products || []).map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-lg text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">Qty: {Math.round(Number(p.qty))}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700 shrink-0">{formatCurrency(p.revenue)}</p>
              </div>
            ))}
            {(!stats?.top_products || stats.top_products.length === 0) && (
              <p className="text-slate-400 text-sm text-center py-6">{t("noDataYet")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
