import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Alert, ScrollView,
} from "react-native";
import { staffApi } from "../../lib/api";
import { StaffMember } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";

export default function StaffScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "", salary: "", notes: "" });

  const { data: staff = [], isLoading, refetch } = useQuery<StaffMember[]>({
    queryKey: ["staff", search],
    queryFn: () => staffApi.list({ search: search || undefined }),
  });

  const totalSalary = staff.reduce((s, m) => s + (Number(m.salary) || 0), 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", role: "", salary: "", notes: "" });
    setShowAdd(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone ?? "", email: m.email ?? "", role: m.role ?? "", salary: m.salary ? String(m.salary) : "", notes: m.notes ?? "" });
    setShowAdd(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : undefined,
      };
      return editing ? staffApi.update(editing.id, payload) : staffApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setShowAdd(false);
    },
    onError: () => Alert.alert("Error", "Failed to save staff member"),
  });

  const FIELDS = [
    { key: "name", label: "Name *", placeholder: "Full name", keyboard: "default" },
    { key: "role", label: "Role", placeholder: "e.g. Manager, Cashier" },
    { key: "phone", label: "Phone", placeholder: "+91 XXXXX XXXXX" },
    { key: "email", label: "Email", placeholder: "email@example.com" },
    { key: "salary", label: "Monthly Salary (₹)", placeholder: "0.00", keyboard: "decimal-pad" },
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
  ] as const;

  const roleInitial = (role?: string) => (role ? role[0].toUpperCase() : "S");

  return (
    <View style={s.bg}>
      {/* Summary */}
      <View style={s.summary}>
        <View>
          <Text style={s.summaryLabel}>Monthly Payroll</Text>
          <Text style={s.summaryAmount}>{formatCurrency(totalSalary)}</Text>
        </View>
        <Text style={s.summaryCount}>{staff.length} members</Text>
      </View>

      <View style={s.topBar}>
        <TextInput
          style={s.search} placeholder="Search staff…"
          value={search} onChangeText={setSearch} placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          onRefresh={refetch} refreshing={isLoading}
          ListEmptyComponent={<Text style={s.empty}>No staff members yet</Text>}
          renderItem={({ item: m }) => (
            <TouchableOpacity style={s.card} onPress={() => openEdit(m)}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{m.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.name}</Text>
                {m.role && <Text style={s.sub}>🏷️ {m.role}</Text>}
                {m.phone && <Text style={s.sub}>📞 {m.phone}</Text>}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {m.salary ? <Text style={s.salary}>{formatCurrency(m.salary)}<Text style={s.salaryLabel}>/mo</Text></Text> : null}
                <View style={[s.badge, { backgroundColor: m.is_active ? "#DCFCE7" : "#F1F5F9" }]}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: m.is_active ? "#16A34A" : "#94A3B8" }}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.overlay}>
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={s.modalTitle}>{editing ? "Edit Staff Member" : "Add Staff Member"}</Text>
            {FIELDS.map(({ key, label, placeholder }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholderTextColor="#94A3B8"
                  keyboardType={key === "salary" ? "decimal-pad" : "default"}
                  multiline={key === "notes"}
                />
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
                disabled={saveMutation.isPending}
                onPress={() => {
                  if (!form.name) { Alert.alert("Name is required"); return; }
                  saveMutation.mutate();
                }}
              >
                <Text style={s.saveText}>{saveMutation.isPending ? "Saving…" : "Save"}</Text>
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
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1E1B4B", padding: 20 },
  summaryLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  summaryAmount: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 2 },
  summaryCount: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  topBar: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  search: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1E293B", borderWidth: 1.5, borderColor: "#E2E8F0" },
  addBtn: { backgroundColor: "#7C3AED", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#2563EB" },
  name: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  salary: { fontSize: 14, fontWeight: "800", color: "#059669" },
  salaryLabel: { fontSize: 11, fontWeight: "400", color: "#94A3B8" },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 13, fontSize: 15, color: "#1E293B" },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: "#7C3AED", borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
});
