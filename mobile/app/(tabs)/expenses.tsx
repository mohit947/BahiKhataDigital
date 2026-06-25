import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Alert, ScrollView,
} from "react-native";
import { expensesApi } from "../../lib/api";
import { Expense } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";

const CATEGORIES = [
  { value: "rent", label: "Rent", color: "#DC2626", bg: "#FEF2F2" },
  { value: "salary", label: "Salary", color: "#2563EB", bg: "#EFF6FF" },
  { value: "utilities", label: "Utilities", color: "#D97706", bg: "#FFFBEB" },
  { value: "transport", label: "Transport", color: "#EA580C", bg: "#FFF7ED" },
  { value: "raw_materials", label: "Raw Materials", color: "#16A34A", bg: "#F0FDF4" },
  { value: "marketing", label: "Marketing", color: "#7C3AED", bg: "#F5F3FF" },
  { value: "maintenance", label: "Maintenance", color: "#475569", bg: "#F8FAFC" },
  { value: "other", label: "Other", color: "#64748B", bg: "#F1F5F9" },
];

const METHODS = ["cash", "upi", "bank_transfer", "card", "cheque"];

function catInfo(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? { label: value, color: "#64748B", bg: "#F1F5F9" };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ExpensesScreen() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [form, setForm] = useState({
    title: "", amount: "", category: "other",
    payment_method: "cash", expense_date: todayStr(), note: "",
  });

  const { data: expenses = [], isLoading, refetch } = useQuery<Expense[]>({
    queryKey: ["expenses", filterCat],
    queryFn: () => expensesApi.list({
      date_from: firstOfMonth(),
      date_to: todayStr(),
      category: filterCat || undefined,
    }),
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const addMutation = useMutation({
    mutationFn: () => expensesApi.create({
      ...form,
      amount: parseFloat(form.amount),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setShowAdd(false);
      setForm({ title: "", amount: "", category: "other", payment_method: "cash", expense_date: todayStr(), note: "" });
    },
    onError: () => Alert.alert("Error", "Failed to save expense"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
    onError: () => Alert.alert("Error", "Failed to delete"),
  });

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Expense", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <View style={s.bg}>
      {/* Summary */}
      <View style={s.summary}>
        <View>
          <Text style={s.summaryLabel}>This Month</Text>
          <Text style={s.summaryAmount}>{formatCurrency(total)}</Text>
        </View>
        <Text style={s.summaryCount}>{expenses.length} entries</Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity
          style={[s.filterChip, !filterCat && s.filterChipActive]}
          onPress={() => setFilterCat("")}
        >
          <Text style={[s.filterChipText, !filterCat && s.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[s.filterChip, filterCat === c.value && s.filterChipActive]}
            onPress={() => setFilterCat(filterCat === c.value ? "" : c.value)}
          >
            <Text style={[s.filterChipText, filterCat === c.value && s.filterChipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add button */}
      <View style={s.addRow}>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add Expense</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onRefresh={refetch} refreshing={isLoading}
          ListEmptyComponent={<Text style={s.empty}>No expenses this month</Text>}
          renderItem={({ item: e }) => {
            const cat = catInfo(e.category);
            return (
              <View style={s.card}>
                <View style={[s.catDot, { backgroundColor: cat.bg }]}>
                  <Text style={{ fontSize: 10, color: cat.color, fontWeight: "700" }}>{cat.label.slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{e.title}</Text>
                  <Text style={s.sub}>{e.expense_date.slice(0, 10)} · {e.payment_method}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={s.amount}>{formatCurrency(e.amount)}</Text>
                  <TouchableOpacity onPress={() => confirmDelete(e.id)}>
                    <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600" }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.overlay}>
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={s.modalTitle}>Add Expense</Text>

            <Text style={s.label}>Title *</Text>
            <TextInput style={s.input} placeholder="e.g. Office Rent" value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Amount (₹) *</Text>
            <TextInput style={s.input} placeholder="0.00" keyboardType="decimal-pad"
              value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))} placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c.value}
                    style={[s.filterChip, form.category === c.value && s.filterChipActive]}
                    onPress={() => setForm((f) => ({ ...f, category: c.value }))}>
                    <Text style={[s.filterChipText, form.category === c.value && s.filterChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.label}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {METHODS.map((m) => (
                  <TouchableOpacity key={m}
                    style={[s.filterChip, form.payment_method === m && s.filterChipActive]}
                    onPress={() => setForm((f) => ({ ...f, payment_method: m }))}>
                    <Text style={[s.filterChipText, form.payment_method === m && s.filterChipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.label}>Date</Text>
            <TextInput style={s.input} value={form.expense_date}
              onChangeText={(v) => setForm((f) => ({ ...f, expense_date: v }))} placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Note</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Optional note" multiline value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} placeholderTextColor="#94A3B8" />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, addMutation.isPending && { opacity: 0.6 }]}
                disabled={addMutation.isPending}
                onPress={() => {
                  if (!form.title) { Alert.alert("Title is required"); return; }
                  if (!form.amount || isNaN(parseFloat(form.amount))) { Alert.alert("Valid amount required"); return; }
                  addMutation.mutate();
                }}
              >
                <Text style={s.saveText}>{addMutation.isPending ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#7C3AED", padding: 20 },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
  summaryAmount: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 2 },
  summaryCount: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  filterRow: { maxHeight: 48, marginTop: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  filterChipText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  addRow: { padding: 16, paddingBottom: 8 },
  addBtn: { backgroundColor: "#7C3AED", borderRadius: 12, padding: 14, alignItems: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  catDot: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  sub: { fontSize: 12, color: "#94A3B8", marginTop: 3 },
  amount: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  empty: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 13, fontSize: 15, color: "#1E293B", marginBottom: 16 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: "#7C3AED", borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
});
