import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { billsApi } from "../../lib/api";
import { BillListItem } from "../../lib/types";
import { formatCurrency, formatDate, statusColor } from "../../lib/utils";

const STATUSES = ["", "paid", "pending", "partial", "cancelled"];

export default function BillsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data: bills = [], isLoading, refetch } = useQuery<BillListItem[]>({
    queryKey: ["bills", search, status],
    queryFn: () => billsApi.list({ search: search || undefined, status: status || undefined }),
  });

  return (
    <View style={s.bg}>
      <View style={s.topBar}>
        <TextInput
          style={s.search} placeholder="Search bill, customer, phone…"
          value={search} onChangeText={setSearch}
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={s.newBtn} onPress={() => router.push("/bill/new")}>
          <Text style={s.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter chips */}
      <View style={s.chips}>
        {STATUSES.map((st) => (
          <TouchableOpacity
            key={st}
            style={[s.chip, status === st && s.chipActive]}
            onPress={() => setStatus(st)}
          >
            <Text style={[s.chipText, status === st && s.chipTextActive]}>
              {st || "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={<Text style={s.empty}>No bills found</Text>}
          renderItem={({ item: bill }) => {
            const sc = statusColor(bill.payment_status);
            const balance = Number(bill.grand_total) - Number(bill.amount_paid);
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/bill/${bill.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.billNo}>{bill.bill_number}</Text>
                  <Text style={s.customer}>{bill.customer_name || "Walk-in"}</Text>
                  {bill.customer_phone && <Text style={s.phone}>{bill.customer_phone}</Text>}
                  <Text style={s.date}>{formatDate(bill.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={s.amount}>{formatCurrency(bill.grand_total)}</Text>
                  {balance > 0 && (
                    <Text style={s.balance}>Due: {formatCurrency(balance)}</Text>
                  )}
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.text }]}>{bill.payment_status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  topBar: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  search: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1E293B", borderWidth: 1.5, borderColor: "#E2E8F0" },
  newBtn: { backgroundColor: "#7C3AED", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1.5, borderColor: "transparent" },
  chipActive: { backgroundColor: "#EDE9FE", borderColor: "#7C3AED" },
  chipText: { fontSize: 12, color: "#64748B", fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: "#7C3AED" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  billNo: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  customer: { fontSize: 13, color: "#475569", marginTop: 2 },
  phone: { fontSize: 12, color: "#94A3B8" },
  date: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "800", color: "#1E1B4B" },
  balance: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  empty: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 14 },
});
