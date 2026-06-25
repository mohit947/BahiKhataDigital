import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { billsApi, expensesApi } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const QUICK_RANGES = [
  { label: "Today", from: todayStr(), to: todayStr() },
  { label: "This Month", from: firstOfMonth(), to: todayStr() },
];

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent", salary: "Salary", utilities: "Utilities", transport: "Transport",
  raw_materials: "Raw Materials", marketing: "Marketing", maintenance: "Maintenance", other: "Other",
};

function SummaryCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[s.card, { backgroundColor: bg }]}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={[s.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayStr());

  const { data: report, isLoading: rLoading, refetch } = useQuery({
    queryKey: ["report", dateFrom, dateTo],
    queryFn: () => billsApi.report({ date_from: dateFrom, date_to: dateTo }),
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: expStats, isLoading: eLoading } = useQuery({
    queryKey: ["expense-stats", dateFrom, dateTo],
    queryFn: () => expensesApi.stats({ date_from: dateFrom, date_to: dateTo }),
    enabled: !!dateFrom && !!dateTo,
  });

  const isLoading = rLoading || eLoading;
  const netProfit = report && expStats
    ? report.summary.total_collected - expStats.total
    : null;

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Quick range buttons */}
      <View style={s.quickRow}>
        {QUICK_RANGES.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={[s.rangeBtn, dateFrom === r.from && dateTo === r.to && s.rangeBtnActive]}
            onPress={() => { setDateFrom(r.from); setDateTo(r.to); }}
          >
            <Text style={[s.rangeBtnText, dateFrom === r.from && dateTo === r.to && s.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
      ) : report ? (
        <>
          {/* Revenue cards */}
          <Text style={s.section}>Revenue</Text>
          <View style={s.row}>
            <SummaryCard label="Total Billed" value={formatCurrency(report.summary.total_billed)} color="#2563EB" bg="#EFF6FF" />
            <SummaryCard label="Collected" value={formatCurrency(report.summary.total_collected)} color="#059669" bg="#ECFDF5" />
          </View>
          <View style={s.row}>
            <SummaryCard label="Outstanding" value={formatCurrency(report.summary.total_billed - report.summary.total_collected)} color="#DC2626" bg="#FEF2F2" />
            <SummaryCard label="Total Bills" value={String(report.summary.total_bills)} color="#7C3AED" bg="#F5F3FF" />
          </View>

          {/* P&L */}
          {expStats && netProfit !== null && (
            <>
              <Text style={s.section}>Profit & Loss</Text>
              <View style={[s.plCard, { borderLeftColor: netProfit >= 0 ? "#059669" : "#DC2626" }]}>
                <View style={s.plRow}>
                  <Text style={s.plLabel}>Revenue Collected</Text>
                  <Text style={[s.plValue, { color: "#059669" }]}>{formatCurrency(report.summary.total_collected)}</Text>
                </View>
                <View style={s.plRow}>
                  <Text style={s.plLabel}>Total Expenses</Text>
                  <Text style={[s.plValue, { color: "#DC2626" }]}>− {formatCurrency(expStats.total)}</Text>
                </View>
                <View style={[s.plDivider]} />
                <View style={s.plRow}>
                  <Text style={[s.plLabel, { fontWeight: "800", color: "#1E293B" }]}>Net {netProfit >= 0 ? "Profit" : "Loss"}</Text>
                  <Text style={[s.plValue, { color: netProfit >= 0 ? "#059669" : "#DC2626", fontSize: 18 }]}>
                    {formatCurrency(Math.abs(netProfit))}
                  </Text>
                </View>
              </View>

              {/* Expense breakdown */}
              {expStats.by_category?.length > 0 && (
                <>
                  <Text style={s.section}>Expense Breakdown</Text>
                  <View style={s.breakdownCard}>
                    {expStats.by_category.map((c: { category: string; total: number; count: number }) => {
                      const pct = expStats.total > 0 ? (c.total / expStats.total) * 100 : 0;
                      return (
                        <View key={c.category} style={{ marginBottom: 14 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>
                              {CATEGORY_LABELS[c.category] || c.category}
                            </Text>
                            <Text style={{ fontSize: 13, color: "#64748B" }}>
                              {c.count} · {formatCurrency(c.total)}
                            </Text>
                          </View>
                          <View style={s.barBg}>
                            <View style={[s.barFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          {/* Payment methods */}
          {report.by_method?.length > 0 && (
            <>
              <Text style={s.section}>By Payment Method</Text>
              <View style={s.breakdownCard}>
                {report.by_method.map((m: { method: string; count: number; collected: number }) => (
                  <View key={m.method} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B", textTransform: "capitalize" }}>{m.method.replace("_", " ")}</Text>
                    <Text style={{ fontSize: 14, color: "#059669", fontWeight: "700" }}>{formatCurrency(m.collected)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Daily table */}
          {report.daily?.length > 0 && (
            <>
              <Text style={s.section}>Daily Breakdown</Text>
              <View style={s.breakdownCard}>
                <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginBottom: 8 }}>
                  <Text style={[s.thCell, { flex: 2 }]}>Date</Text>
                  <Text style={[s.thCell, { flex: 1, textAlign: "right" }]}>Bills</Text>
                  <Text style={[s.thCell, { flex: 2, textAlign: "right" }]}>Collected</Text>
                </View>
                {report.daily.map((r: { day: string; count: number; collected: number }) => (
                  <View key={r.day} style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                    <Text style={[s.tdCell, { flex: 2 }]}>{r.day}</Text>
                    <Text style={[s.tdCell, { flex: 1, textAlign: "right" }]}>{r.count}</Text>
                    <Text style={[s.tdCell, { flex: 2, textAlign: "right", color: "#059669", fontWeight: "700" }]}>{formatCurrency(r.collected)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      ) : (
        <Text style={s.empty}>Select a date range to view report</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  rangeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#fff", alignItems: "center" },
  rangeBtnActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  rangeBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  rangeBtnTextActive: { color: "#fff" },
  section: { fontSize: 14, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: { flex: 1, borderRadius: 14, padding: 14 },
  cardLabel: { fontSize: 11, color: "#64748B", fontWeight: "600", marginBottom: 4 },
  cardValue: { fontSize: 17, fontWeight: "800" },
  plCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderLeftWidth: 4, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  plRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  plLabel: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  plValue: { fontSize: 15, fontWeight: "700" },
  plDivider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 4 },
  breakdownCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  barBg: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 3 },
  barFill: { height: 6, backgroundColor: "#7C3AED", borderRadius: 3 },
  thCell: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" },
  tdCell: { fontSize: 13, color: "#1E293B" },
  empty: { color: "#94A3B8", textAlign: "center", marginTop: 60, fontSize: 14 },
});
