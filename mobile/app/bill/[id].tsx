import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { billsApi } from "../../lib/api";
import { Bill } from "../../lib/types";
import { formatCurrency, formatDate, statusColor } from "../../lib/utils";

const METHODS = ["cash", "upi", "card", "bank_transfer", "cheque"];

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");

  const { data: bill, isLoading } = useQuery<Bill>({
    queryKey: ["bill", id],
    queryFn: () => billsApi.get(id),
  });

  const payMutation = useMutation({
    mutationFn: () =>
      billsApi.addPayment(id, { amount: parseFloat(amount), method, note: note || undefined }),
    onSuccess: (updated) => {
      qc.setQueryData(["bill", id], updated);
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setShowPayment(false);
      setAmount(""); setNote("");
    },
    onError: () => Alert.alert("Error", "Payment failed"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billsApi.cancel(id),
    onSuccess: (updated) => {
      qc.setQueryData(["bill", id], updated);
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => Alert.alert("Error", "Cancel failed"),
  });

  if (isLoading) return <ActivityIndicator color="#7C3AED" style={{ marginTop: 60 }} />;
  if (!bill) return <Text style={{ textAlign: "center", marginTop: 60, color: "#94A3B8" }}>Bill not found</Text>;

  const balance = Number(bill.grand_total) - Number(bill.amount_paid);
  const sc = statusColor(bill.payment_status);
  const isPaid = bill.payment_status === "paid";
  const isCancelled = bill.payment_status === "cancelled";
  const entered = parseFloat(amount) || 0;
  const excess = Math.max(0, entered - balance);

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={s.card}>
        <View style={s.row}>
          <View>
            <Text style={s.billNo}>{bill.bill_number}</Text>
            <Text style={s.date}>{formatDate(bill.created_at)}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: sc.bg }]}>
            <Text style={[s.badgeText, { color: sc.text }]}>{bill.payment_status}</Text>
          </View>
        </View>

        {bill.customer_name && (
          <View style={[s.row, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
            <Text style={s.subLabel}>Customer</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.subValue}>{bill.customer_name}</Text>
              {bill.customer_phone && <Text style={s.sub2}>{bill.customer_phone}</Text>}
            </View>
          </View>
        )}

        {/* Amounts */}
        <View style={s.amtRow}>
          <AmtBox label="Total" value={formatCurrency(bill.grand_total)} />
          <AmtBox label="Paid" value={formatCurrency(bill.amount_paid)} color="#059669" bg="#ECFDF5" />
          <AmtBox label="Due" value={formatCurrency(balance)} color={balance > 0 ? "#DC2626" : "#059669"} bg={balance > 0 ? "#FEF2F2" : "#ECFDF5"} />
        </View>
      </View>

      {/* Items */}
      <Text style={s.sectionTitle}>Items</Text>
      <View style={s.card}>
        {bill.items.map((item, i) => (
          <View key={item.id} style={[s.itemRow, i > 0 && { borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 10, paddingTop: 10 }]}>
            <Text style={s.itemName}>{item.product_name}</Text>
            <Text style={s.itemSub}>{item.quantity} {item.unit} × {formatCurrency(item.rate)}</Text>
            {item.discount_percent > 0 && <Text style={s.itemSub}>Disc {item.discount_percent}%</Text>}
            {item.gst_percent > 0 && <Text style={s.itemSub}>GST {item.gst_percent}%</Text>}
            <Text style={s.itemTotal}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 12, paddingTop: 12 }}>
          <View style={s.row}><Text style={s.sub2}>Subtotal</Text><Text style={s.sub2}>{formatCurrency(bill.subtotal)}</Text></View>
          {Number(bill.discount_total) > 0 && <View style={s.row}><Text style={s.sub2}>Discount</Text><Text style={{ color: "#059669", fontSize: 13 }}>-{formatCurrency(bill.discount_total)}</Text></View>}
          {Number(bill.gst_total) > 0 && <View style={s.row}><Text style={s.sub2}>GST</Text><Text style={s.sub2}>{formatCurrency(bill.gst_total)}</Text></View>}
          <View style={[s.row, { marginTop: 6 }]}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#1E293B" }}>Grand Total</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#7C3AED" }}>{formatCurrency(bill.grand_total)}</Text>
          </View>
        </View>
      </View>

      {/* Payment history */}
      {bill.payment_logs.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Payment History</Text>
          <View style={s.card}>
            {bill.payment_logs.map((log, i) => (
              <View key={log.id} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 10, paddingTop: 10 }]}>
                <View>
                  <Text style={s.subValue}>{formatCurrency(log.amount)}</Text>
                  <Text style={s.sub2}>{log.method}{log.note ? ` · ${log.note}` : ""}</Text>
                </View>
                <Text style={s.sub2}>{formatDate(log.created_at)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Actions */}
      {!isCancelled && (
        <View style={{ gap: 10, marginTop: 8 }}>
          {!isPaid && (
            <TouchableOpacity style={s.primaryBtn} onPress={() => setShowPayment(true)}>
              <Text style={s.primaryBtnText}>💳 Record Payment</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push(`/bill/new?from=${id}`)}>
            <Text style={s.secondaryBtnText}>📋 Duplicate Bill</Text>
          </TouchableOpacity>
          {!isPaid && (
            <TouchableOpacity
              style={s.dangerBtn}
              onPress={() => Alert.alert("Cancel Bill", "Are you sure?", [
                { text: "No" },
                { text: "Yes, Cancel", style: "destructive", onPress: () => cancelMutation.mutate() },
              ])}
            >
              <Text style={s.dangerBtnText}>{cancelMutation.isPending ? "Cancelling…" : "✕ Cancel Bill"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Record Payment</Text>
            <Text style={[s.sub2, { marginBottom: 16 }]}>Balance due: {formatCurrency(balance)}</Text>

            <Text style={s.label}>Amount (₹)</Text>
            <TextInput
              style={[s.input, excess > 0 && { borderColor: "#F59E0B" }]}
              value={amount} onChangeText={setAmount}
              keyboardType="decimal-pad" placeholder="0.00"
              placeholderTextColor="#94A3B8"
            />
            {excess > 0 && (
              <Text style={{ color: "#D97706", fontSize: 12, marginBottom: 12, fontWeight: "600" }}>
                ₹{excess.toFixed(2)} will be added to customer credit
              </Text>
            )}

            <Text style={s.label}>Method</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {METHODS.map((m) => (
                <TouchableOpacity key={m}
                  style={[s.methodChip, method === m && s.methodChipActive]}
                  onPress={() => setMethod(m)}>
                  <Text style={[s.methodText, method === m && s.methodTextActive]}>
                    {m.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Note (optional)</Text>
            <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="e.g. Cash in hand" placeholderTextColor="#94A3B8" />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowPayment(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, payMutation.isPending && { opacity: 0.6 }]}
                onPress={() => {
                  if (!amount || parseFloat(amount) <= 0) { Alert.alert("Enter valid amount"); return; }
                  payMutation.mutate();
                }}
                disabled={payMutation.isPending}
              >
                <Text style={s.saveText}>{payMutation.isPending ? "Saving…" : "Record"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function AmtBox({ label, value, color = "#1E293B", bg = "#F8FAFC" }: { label: string; value: string; color?: string; bg?: string }) {
  return (
    <View style={[s.amtBox, { backgroundColor: bg }]}>
      <Text style={s.amtLabel}>{label}</Text>
      <Text style={[s.amtValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  back: { marginBottom: 12 },
  backText: { color: "#7C3AED", fontWeight: "600", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  billNo: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  date: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  subLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  subValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  sub2: { fontSize: 12, color: "#64748B", marginTop: 2 },
  amtRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  amtBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  amtLabel: { fontSize: 11, color: "#64748B", fontWeight: "500" },
  amtValue: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  itemRow: {},
  itemName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  itemSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: "700", color: "#7C3AED", marginTop: 4 },
  primaryBtn: { backgroundColor: "#7C3AED", borderRadius: 14, padding: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#E2E8F0" },
  secondaryBtnText: { color: "#475569", fontWeight: "600", fontSize: 15 },
  dangerBtn: { backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#FCA5A5" },
  dangerBtnText: { color: "#DC2626", fontWeight: "600", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 8, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 13, fontSize: 15, color: "#1E293B", marginBottom: 16 },
  methodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1.5, borderColor: "transparent" },
  methodChipActive: { backgroundColor: "#EDE9FE", borderColor: "#7C3AED" },
  methodText: { fontSize: 12, color: "#64748B", fontWeight: "600", textTransform: "capitalize" },
  methodTextActive: { color: "#7C3AED" },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: "#7C3AED", borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
});
