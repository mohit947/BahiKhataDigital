import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Alert,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../../lib/api";
import { Customer } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";

export default function CustomersScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ["customers", search],
    queryFn: () => customersApi.list({ search: search || undefined }),
  });

  const addMutation = useMutation({
    mutationFn: () => customersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowAdd(false);
      setForm({ name: "", phone: "", email: "", address: "" });
    },
    onError: () => Alert.alert("Error", "Failed to add customer"),
  });

  return (
    <View style={s.bg}>
      <View style={s.topBar}>
        <TextInput
          style={s.search} placeholder="Search name, phone, email…"
          value={search} onChangeText={setSearch} placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onRefresh={refetch} refreshing={isLoading}
          ListEmptyComponent={<Text style={s.empty}>No customers yet</Text>}
          renderItem={({ item: c }) => (
            <View style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{c.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{c.name}</Text>
                {c.phone && <Text style={s.sub}>{c.phone}</Text>}
                {c.email && <Text style={s.sub}>{c.email}</Text>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {Number(c.credit_balance) > 0 && (
                  <View style={s.creditBadge}>
                    <Text style={s.creditText}>Credit: {formatCurrency(c.credit_balance)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Customer</Text>
            {[
              { key: "name", label: "Name *", placeholder: "Customer name" },
              { key: "phone", label: "Phone", placeholder: "+91 XXXXX XXXXX" },
              { key: "email", label: "Email", placeholder: "email@example.com" },
              { key: "address", label: "Address", placeholder: "Full address" },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, addMutation.isPending && { opacity: 0.6 }]}
                onPress={() => {
                  if (!form.name) { Alert.alert("Name is required"); return; }
                  addMutation.mutate();
                }}
                disabled={addMutation.isPending}
              >
                <Text style={s.saveText}>{addMutation.isPending ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#7C3AED" },
  name: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  creditBadge: { backgroundColor: "#EDE9FE", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  creditText: { fontSize: 11, color: "#7C3AED", fontWeight: "600" },
  empty: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 13, fontSize: 15, color: "#1E293B" },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: "#7C3AED", borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
});
