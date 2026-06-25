import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Alert, ScrollView,
} from "react-native";
import { suppliersApi } from "../../lib/api";
import { Supplier } from "../../lib/types";

export default function SuppliersScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", gstin: "", contact_person: "", notes: "" });

  const { data: suppliers = [], isLoading, refetch } = useQuery<Supplier[]>({
    queryKey: ["suppliers", search],
    queryFn: () => suppliersApi.list({ search: search || undefined }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", gstin: "", contact_person: "", notes: "" });
    setShowAdd(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", gstin: s.gstin ?? "", contact_person: s.contact_person ?? "", notes: s.notes ?? "" });
    setShowAdd(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? suppliersApi.update(editing.id, form)
      : suppliersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setShowAdd(false);
    },
    onError: () => Alert.alert("Error", "Failed to save supplier"),
  });

  const FIELDS = [
    { key: "name", label: "Name *", placeholder: "Supplier name" },
    { key: "contact_person", label: "Contact Person", placeholder: "e.g. Ramesh Kumar" },
    { key: "phone", label: "Phone", placeholder: "+91 XXXXX XXXXX" },
    { key: "email", label: "Email", placeholder: "email@example.com" },
    { key: "address", label: "Address", placeholder: "Full address" },
    { key: "gstin", label: "GSTIN", placeholder: "22AAAAA0000A1Z5" },
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
  ] as const;

  return (
    <View style={s.bg}>
      <View style={s.topBar}>
        <TextInput
          style={s.search} placeholder="Search suppliers…"
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
          data={suppliers}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onRefresh={refetch} refreshing={isLoading}
          ListEmptyComponent={<Text style={s.empty}>No suppliers yet</Text>}
          renderItem={({ item: sup }) => (
            <TouchableOpacity style={s.card} onPress={() => openEdit(sup)}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{sup.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{sup.name}</Text>
                {sup.contact_person && <Text style={s.sub}>👤 {sup.contact_person}</Text>}
                {sup.phone && <Text style={s.sub}>📞 {sup.phone}</Text>}
                {sup.gstin && <Text style={s.sub}>GST: {sup.gstin}</Text>}
              </View>
              <View style={[s.badge, { backgroundColor: sup.is_active ? "#DCFCE7" : "#F1F5F9" }]}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: sup.is_active ? "#16A34A" : "#94A3B8" }}>
                  {sup.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.overlay}>
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={s.modalTitle}>{editing ? "Edit Supplier" : "Add Supplier"}</Text>
            {FIELDS.map(({ key, label, placeholder }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input} placeholder={placeholder}
                  value={form[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholderTextColor="#94A3B8"
                  multiline={key === "notes" || key === "address"}
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
  topBar: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 12 },
  search: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1E293B", borderWidth: 1.5, borderColor: "#E2E8F0" },
  addBtn: { backgroundColor: "#7C3AED", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#EA580C" },
  name: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
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
