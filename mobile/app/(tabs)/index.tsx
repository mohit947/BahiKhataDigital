import { useQuery } from "@tanstack/react-query";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { billsApi } from "../../lib/api";
import { DashboardStats, BillListItem } from "../../lib/types";
import { formatCurrency, formatDate, statusColor } from "../../lib/utils";
import { clearAuth } from "../../lib/auth";

export default function DashboardScreen() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["stats"],
    queryFn: () => billsApi.stats(),
  });
  const { data: bills = [], isLoading: billsLoading } = useQuery<BillListItem[]>({
    queryKey: ["bills"],
    queryFn: () => billsApi.list(),
  });

  const recent = bills.slice(0, 5);

  const handleSignOut = async () => {
    await clearAuth();
    router.replace("/login");
  };

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good day 👋</Text>
          <Text style={s.shopName}>BahiKhataDigital</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={s.signOutBtn}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stat Cards */}
      {statsLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={s.row}>
            <StatCard label="Total Revenue" value={formatCurrency(stats?.total_revenue ?? 0)} color="#7C3AED" bg="#F5F3FF" />
            <StatCard label="Pending" value={formatCurrency(stats?.pending_amount ?? 0)} color="#DC2626" bg="#FEF2F2" />
          </View>
          <View style={s.row}>
            <StatCard label="Today's Revenue" value={formatCurrency(stats?.revenue_today ?? 0)} color="#059669" bg="#ECFDF5" />
            <StatCard label="Bills Today" value={String(stats?.bills_today ?? 0)} color="#D97706" bg="#FFFBEB" />
          </View>
        </>
      )}

      {/* New Bill Button */}
      <TouchableOpacity style={s.newBillBtn} onPress={() => router.push("/bill/new")}>
        <Text style={s.newBillText}>+ New Bill</Text>
      </TouchableOpacity>

      {/* Recent Bills */}
      <Text style={s.sectionTitle}>Recent Bills</Text>
      {billsLoading ? (
        <ActivityIndicator color="#7C3AED" />
      ) : recent.length === 0 ? (
        <Text style={s.empty}>No bills yet</Text>
      ) : (
        recent.map((bill) => {
          const sc = statusColor(bill.payment_status);
          return (
            <TouchableOpacity key={bill.id} style={s.billCard} onPress={() => router.push(`/bill/${bill.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={s.billNo}>{bill.bill_number}</Text>
                <Text style={s.billCustomer}>{bill.customer_name || "Walk-in"}</Text>
                <Text style={s.billDate}>{formatDate(bill.created_at)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.billAmount}>{formatCurrency(bill.grand_total)}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.text }]}>{bill.payment_status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {bills.length > 5 && (
        <TouchableOpacity onPress={() => router.push("/(tabs)/bills")}>
          <Text style={s.viewAll}>View all bills →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 13, color: "#94A3B8" },
  shopName: { fontSize: 20, fontWeight: "800", color: "#1E1B4B" },
  signOutBtn: { backgroundColor: "#F1F5F9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  signOutText: { color: "#64748B", fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  newBillBtn: { backgroundColor: "#7C3AED", borderRadius: 14, padding: 16, alignItems: "center", marginVertical: 16 },
  newBillText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  empty: { color: "#94A3B8", textAlign: "center", marginVertical: 16 },
  billCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  billNo: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  billCustomer: { fontSize: 12, color: "#64748B", marginTop: 2 },
  billDate: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  billAmount: { fontSize: 15, fontWeight: "700", color: "#1E1B4B" },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  viewAll: { color: "#7C3AED", textAlign: "center", fontWeight: "600", marginTop: 8, fontSize: 14 },
});
