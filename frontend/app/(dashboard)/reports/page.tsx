"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billsApi, expensesApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BarChart2, Download, TrendingUp, IndianRupee, Receipt, Wallet, MinusCircle, PiggyBank } from "lucide-react";
import { useT } from "@/lib/i18n";

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent", salary: "Salary", utilities: "Utilities", transport: "Transport",
  raw_materials: "Raw Materials", marketing: "Marketing", maintenance: "Maintenance", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  rent: "bg-red-500", salary: "bg-blue-500", utilities: "bg-yellow-500", transport: "bg-orange-500",
  raw_materials: "bg-green-500", marketing: "bg-purple-500", maintenance: "bg-slate-500", other: "bg-gray-400",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", upi: "UPI", card: "Card", bank_transfer: "Bank Transfer", cheque: "Cheque",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "bg-emerald-500", upi: "bg-violet-500", card: "bg-blue-500",
  bank_transfer: "bg-orange-500", cheque: "bg-pink-500",
};

export default function ReportsPage() {
  const { t } = useT();
  const [dateFrom, setDateFrom] = useState(monthStartStr());
  const [dateTo, setDateTo] = useState(todayStr());

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["report", dateFrom, dateTo],
    queryFn: () => billsApi.report({ date_from: dateFrom, date_to: dateTo }),
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: expenseStats } = useQuery({
    queryKey: ["expense-stats", dateFrom, dateTo],
    queryFn: () => expensesApi.stats({ date_from: dateFrom, date_to: dateTo }),
    enabled: !!dateFrom && !!dateTo,
  });

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["Date", "Bills", "Total Billed (₹)", "Collected (₹)"],
      ...report.daily.map((r: { day: string; count: number; total: number; collected: number }) => [
        r.day, r.count, r.total.toFixed(2), r.collected.toFixed(2),
      ]),
      [],
      ["Summary", "", "", ""],
      ["Total Bills", report.summary.total_bills, "", ""],
      ["Total Billed", "", report.summary.total_billed.toFixed(2), ""],
      ["Total Collected", "", "", report.summary.total_collected.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vanya-report-${dateFrom}-to-${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const maxCollected = report?.daily?.reduce(
    (m: number, r: { collected: number }) => Math.max(m, r.collected), 0
  ) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t("revenueReports")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t("dayByDayDesc")}</p>
        </div>
        {report && (
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={15} /> {t("exportCSV")}
          </button>
        )}
      </div>

      {/* Date filter */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("dateFrom")}</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="input-field" max={dateTo} />
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t("dateTo")}</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="input-field" min={dateFrom} max={todayStr()} />
        </div>
        <button onClick={() => refetch()} className="btn-primary">{t("apply")}</button>
        <div className="flex gap-2">
          <button onClick={() => { setDateFrom(todayStr()); setDateTo(todayStr()); }}
            className="btn-secondary text-xs px-3">{t("today")}</button>
          <button onClick={() => { setDateFrom(monthStartStr()); setDateTo(todayStr()); }}
            className="btn-secondary text-xs px-3">{t("thisMonth")}</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Receipt size={18} className="text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-slate-500">{t("totalBills")}</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{report.summary.total_bills}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <IndianRupee size={18} className="text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-slate-500">{t("totalBilled")}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(report.summary.total_billed)}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet size={18} className="text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-500">{t("totalCollectedStat")}</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(report.summary.total_collected)}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-red-500" />
                </div>
                <p className="text-sm font-semibold text-slate-500">{t("outstanding")}</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(report.summary.total_billed - report.summary.total_collected)}
              </p>
            </div>
          </div>

          {/* P&L Summary */}
          {expenseStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card p-5 border-l-4 border-emerald-500">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet size={18} className="text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-500">Revenue Collected</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(report.summary.total_collected)}</p>
              </div>
              <div className="card p-5 border-l-4 border-red-400">
                <div className="flex items-center gap-3 mb-2">
                  <MinusCircle size={18} className="text-red-500" />
                  <p className="text-sm font-semibold text-slate-500">Total Expenses</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(expenseStats.total)}</p>
              </div>
              <div className={`card p-5 border-l-4 ${report.summary.total_collected - expenseStats.total >= 0 ? "border-violet-500" : "border-orange-500"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <PiggyBank size={18} className={report.summary.total_collected - expenseStats.total >= 0 ? "text-violet-600" : "text-orange-600"} />
                  <p className="text-sm font-semibold text-slate-500">Net Profit / Loss</p>
                </div>
                <p className={`text-2xl font-bold ${report.summary.total_collected - expenseStats.total >= 0 ? "text-violet-700" : "text-orange-600"}`}>
                  {formatCurrency(Math.abs(report.summary.total_collected - expenseStats.total))}
                  <span className="text-sm font-normal ml-1">{report.summary.total_collected - expenseStats.total >= 0 ? "profit" : "loss"}</span>
                </p>
              </div>
            </div>
          )}

          {/* Expense breakdown */}
          {expenseStats?.by_category?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MinusCircle size={16} className="text-red-500" /> Expense Breakdown
              </h3>
              <div className="space-y-3">
                {expenseStats.by_category.map((c: { category: string; count: number; total: number }) => {
                  const pct = expenseStats.total > 0 ? (c.total / expenseStats.total) * 100 : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{CATEGORY_LABELS[c.category] || c.category}</span>
                        <span className="text-slate-500">{c.count} entries · {formatCurrency(c.total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${CATEGORY_COLORS[c.category] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment method breakdown */}
          {report.by_method?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-violet-500" /> {t("collectionByMethod")}
              </h3>
              <div className="space-y-3">
                {report.by_method.map((m: { method: string; count: number; collected: number }) => {
                  const pct = report.summary.total_collected > 0
                    ? (m.collected / report.summary.total_collected) * 100 : 0;
                  return (
                    <div key={m.method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{METHOD_LABELS[m.method] || m.method}</span>
                        <span className="text-slate-500">{m.count} bills · {formatCurrency(m.collected)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${METHOD_COLORS[m.method] || "bg-slate-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily chart + table */}
          {report.daily?.length > 0 ? (
            <div className="card overflow-hidden">
              {/* Mini bar chart */}
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">{t("dailyCollection")}</h3>
                <div className="flex items-end gap-1.5 h-28 overflow-x-auto pb-2">
                  {report.daily.map((r: { day: string; count: number; total: number; collected: number }) => {
                    const height = maxCollected > 0 ? Math.max(4, (r.collected / maxCollected) * 100) : 4;
                    return (
                      <div key={r.day} className="flex flex-col items-center gap-1 min-w-[28px] group cursor-default">
                        <div className="relative">
                          <div
                            className="w-5 rounded-t bg-violet-500 group-hover:bg-violet-600 transition"
                            style={{ height: `${height}px` }}
                          />
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                            <div className="bg-slate-800 text-white text-xs rounded-lg px-2 py-1 shadow-lg">
                              <p className="font-semibold">{formatCurrency(r.collected)}</p>
                              <p className="text-slate-300">{r.count} bill{r.count !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 rotate-45 origin-left mt-2 whitespace-nowrap">
                          {r.day.slice(5)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {[t("date"), t("bills"), t("totalBilled"), t("totalCollectedStat"), t("outstanding")].map((h, i) => (
                        <th key={h} className={`py-3 px-5 text-xs font-semibold text-slate-500 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.map((r: { day: string; count: number; total: number; collected: number }) => (
                      <tr key={r.day} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <td className="py-3 px-5 text-sm font-medium text-slate-800">{r.day}</td>
                        <td className="py-3 px-5 text-sm text-slate-600">{r.count}</td>
                        <td className="py-3 px-5 text-sm text-right text-slate-800">{formatCurrency(r.total)}</td>
                        <td className="py-3 px-5 text-sm text-right font-semibold text-emerald-700">{formatCurrency(r.collected)}</td>
                        <td className="py-3 px-5 text-sm text-right text-red-500">{formatCurrency(r.total - r.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="py-3 px-5 text-sm font-bold text-slate-800">{t("total")}</td>
                      <td className="py-3 px-5 text-sm font-bold text-slate-800">{report.summary.total_bills}</td>
                      <td className="py-3 px-5 text-sm font-bold text-right text-slate-800">{formatCurrency(report.summary.total_billed)}</td>
                      <td className="py-3 px-5 text-sm font-bold text-right text-emerald-700">{formatCurrency(report.summary.total_collected)}</td>
                      <td className="py-3 px-5 text-sm font-bold text-right text-red-500">
                        {formatCurrency(report.summary.total_billed - report.summary.total_collected)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <BarChart2 className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-500 font-medium">{t("noBillsRange")}</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
