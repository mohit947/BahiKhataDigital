import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { billsApi, customersApi, productsApi } from "../../lib/api";
import { Customer, Product } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";

interface Item {
  product_id?: string; product_name: string; unit: string;
  quantity: number; rate: number; discount_percent: number; gst_percent: number;
}

const EMPTY_ITEM: Item = { product_name: "", unit: "pcs", quantity: 1, rate: 0, discount_percent: 0, gst_percent: 0 };

function calcItem(it: Item) {
  const base = it.quantity * it.rate;
  const disc = base * (it.discount_percent / 100);
  const gst = (base - disc) * (it.gst_percent / 100);
  return { ...it, discount_amount: disc, gst_amount: gst, total: base - disc + gst };
}

export default function NewBillScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<Item[]>([EMPTY_ITEM]);
  const [payMethod, setPayMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [prodSearch, setProdSearch] = useState("");

  // Load template bill when duplicating
  const { data: templateBill } = useQuery({
    queryKey: ["bill", from],
    queryFn: () => billsApi.get(from!),
    enabled: !!from,
  });

  useEffect(() => {
    if (!templateBill) return;
    setCustomerName(templateBill.customer_name || "");
    setCustomerPhone(templateBill.customer_phone || "");
    setPayMethod(templateBill.payment_method || "cash");
    setNotes(templateBill.notes || "");
    setAmountPaid("0");
    if (templateBill.customer) setSelectedCustomer(templateBill.customer);
    setItems(templateBill.items.map((it: Item) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      unit: it.unit,
      quantity: Number(it.quantity),
      rate: Number(it.rate),
      discount_percent: Number(it.discount_percent),
      gst_percent: Number(it.gst_percent),
    })));
  }, [templateBill]);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", custSearch],
    queryFn: () => customersApi.list({ search: custSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", prodSearch],
    queryFn: () => productsApi.list({ search: prodSearch || undefined, active_only: true }),
    enabled: showProductPicker,
  });

  const calcTotals = () => {
    const calced = items.map(calcItem);
    const subtotal = calced.reduce((s, i) => s + i.quantity * i.rate, 0);
    const discTotal = calced.reduce((s, i) => s + i.discount_amount, 0);
    const gstTotal = calced.reduce((s, i) => s + i.gst_amount, 0);
    const grand = subtotal - discTotal + gstTotal;
    return { calced, subtotal, discTotal, gstTotal, grand };
  };

  const { calced, subtotal, discTotal, gstTotal, grand } = calcTotals();
  const paid = parseFloat(amountPaid) || 0;

  const createMutation = useMutation({
    mutationFn: () => {
      if (calced.some((i) => !i.product_name)) throw new Error("Fill all item names");
      const payStatus = paid >= grand ? "paid" : paid > 0 ? "partial" : "pending";
      return billsApi.create({
        customer_id: selectedCustomer?.id,
        customer_name: customerName || selectedCustomer?.name,
        customer_phone: customerPhone || selectedCustomer?.phone,
        payment_method: payMethod,
        payment_status: payStatus,
        amount_paid: paid,
        notes: notes || undefined,
        items: calced.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          unit: i.unit,
          quantity: i.quantity,
          rate: i.rate,
          discount_percent: i.discount_percent,
          gst_percent: i.gst_percent,
        })),
      });
    },
    onSuccess: (bill) => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      router.replace(`/bill/${bill.id}`);
    },
    onError: (e: unknown) => {
      const msg = (e as Error).message || "Failed to create bill";
      Alert.alert("Error", msg);
    },
  });

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const METHODS = ["cash", "upi", "card", "bank_transfer", "cheque"];

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled">

      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.title}>{from ? "Duplicate Bill" : "New Bill"}</Text>

      {/* Customer */}
      <Text style={s.sectionTitle}>Customer</Text>
      <View style={s.card}>
        <TouchableOpacity style={s.pickerBtn} onPress={() => setShowCustomerPicker(true)}>
          <Text style={selectedCustomer ? s.pickerSelected : s.pickerPlaceholder}>
            {selectedCustomer ? selectedCustomer.name : "Select existing customer"}
          </Text>
        </TouchableOpacity>
        {selectedCustomer && (
          <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerName(""); setCustomerPhone(""); }}>
            <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 6 }}>✕ Remove</Text>
          </TouchableOpacity>
        )}
        <Text style={[s.label, { marginTop: 14 }]}>Name</Text>
        <TextInput style={s.input} value={customerName} onChangeText={setCustomerName} placeholder="Walk-in customer" placeholderTextColor="#94A3B8" />
        <Text style={s.label}>Phone</Text>
        <TextInput style={s.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
      </View>

      {/* Items */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={s.sectionTitle}>Items</Text>
        <TouchableOpacity onPress={() => setItems((p) => [...p, EMPTY_ITEM])}>
          <Text style={{ color: "#7C3AED", fontWeight: "700" }}>+ Add Row</Text>
        </TouchableOpacity>
      </View>

      {items.map((item, idx) => {
        const c = calcItem(item);
        return (
          <View key={idx} style={[s.card, { marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <TouchableOpacity
                style={s.productPickBtn}
                onPress={() => { setEditingItemIdx(idx); setShowProductPicker(true); }}>
                <Text style={item.product_name ? s.pickerSelected : s.pickerPlaceholder} numberOfLines={1}>
                  {item.product_name || "Pick product…"}
                </Text>
              </TouchableOpacity>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                  <Text style={{ color: "#DC2626", fontSize: 18, lineHeight: 20 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.itemGrid}>
              <View style={s.itemField}>
                <Text style={s.fieldLabel}>Qty</Text>
                <TextInput style={s.smallInput} value={String(item.quantity)} keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(idx, { quantity: parseFloat(v) || 0 })} />
              </View>
              <View style={s.itemField}>
                <Text style={s.fieldLabel}>Rate ₹</Text>
                <TextInput style={s.smallInput} value={String(item.rate)} keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(idx, { rate: parseFloat(v) || 0 })} />
              </View>
              <View style={s.itemField}>
                <Text style={s.fieldLabel}>Disc%</Text>
                <TextInput style={s.smallInput} value={String(item.discount_percent)} keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(idx, { discount_percent: parseFloat(v) || 0 })} />
              </View>
              <View style={s.itemField}>
                <Text style={s.fieldLabel}>GST%</Text>
                <TextInput style={s.smallInput} value={String(item.gst_percent)} keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(idx, { gst_percent: parseFloat(v) || 0 })} />
              </View>
            </View>
            <Text style={{ color: "#7C3AED", fontWeight: "700", textAlign: "right", marginTop: 8 }}>
              {formatCurrency(c.total)}
            </Text>
          </View>
        );
      })}

      {/* Totals */}
      <View style={s.card}>
        <View style={s.totRow}><Text style={s.totLabel}>Subtotal</Text><Text style={s.totVal}>{formatCurrency(subtotal)}</Text></View>
        {discTotal > 0 && <View style={s.totRow}><Text style={s.totLabel}>Discount</Text><Text style={{ color: "#059669", fontWeight: "600" }}>-{formatCurrency(discTotal)}</Text></View>}
        {gstTotal > 0 && <View style={s.totRow}><Text style={s.totLabel}>GST</Text><Text style={s.totVal}>{formatCurrency(gstTotal)}</Text></View>}
        <View style={[s.totRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E2E8F0" }]}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#1E293B" }}>Grand Total</Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#7C3AED" }}>{formatCurrency(grand)}</Text>
        </View>
      </View>

      {/* Payment */}
      <Text style={s.sectionTitle}>Payment</Text>
      <View style={s.card}>
        <Text style={s.label}>Method</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {METHODS.map((m) => (
            <TouchableOpacity key={m}
              style={[s.methodChip, payMethod === m && s.methodChipActive]}
              onPress={() => setPayMethod(m)}>
              <Text style={[s.methodText, payMethod === m && s.methodTextActive]}>
                {m.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>Amount Paid (₹)</Text>
        <TextInput style={s.input} value={amountPaid} onChangeText={setAmountPaid}
          keyboardType="decimal-pad" placeholderTextColor="#94A3B8" />
        <Text style={s.label}>Notes</Text>
        <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]}
          value={notes} onChangeText={setNotes} multiline placeholder="Optional notes…" placeholderTextColor="#94A3B8" />
      </View>

      <TouchableOpacity
        style={[s.createBtn, createMutation.isPending && { opacity: 0.6 }]}
        onPress={() => {
          if (items.every((i) => !i.product_name)) { Alert.alert("Add at least one item"); return; }
          createMutation.mutate();
        }}
        disabled={createMutation.isPending}
      >
        <Text style={s.createBtnText}>{createMutation.isPending ? "Creating…" : "Create Bill"}</Text>
      </TouchableOpacity>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: "70%" }]}>
            <Text style={s.modalTitle}>Select Customer</Text>
            <TextInput style={[s.input, { marginBottom: 12 }]} value={custSearch}
              onChangeText={setCustSearch} placeholder="Search…" placeholderTextColor="#94A3B8" />
            <FlatList
              data={customers}
              keyExtractor={(c) => c.id}
              renderItem={({ item: c }) => (
                <TouchableOpacity style={s.pickerItem} onPress={() => {
                  setSelectedCustomer(c);
                  setCustomerName(c.name);
                  setCustomerPhone(c.phone || "");
                  setShowCustomerPicker(false);
                }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#1E293B" }}>{c.name}</Text>
                  {c.phone && <Text style={{ fontSize: 12, color: "#64748B" }}>{c.phone}</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCustomerPicker(false)}>
              <Text style={s.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: "70%" }]}>
            <Text style={s.modalTitle}>Select Product</Text>
            <TextInput style={[s.input, { marginBottom: 12 }]} value={prodSearch}
              onChangeText={setProdSearch} placeholder="Search…" placeholderTextColor="#94A3B8" />
            <FlatList
              data={products}
              keyExtractor={(p) => p.id}
              renderItem={({ item: p }) => (
                <TouchableOpacity style={s.pickerItem} onPress={() => {
                  if (editingItemIdx !== null) {
                    updateItem(editingItemIdx, {
                      product_id: p.id,
                      product_name: p.name,
                      unit: p.unit,
                      rate: p.rate,
                      gst_percent: p.gst_rate,
                    });
                  }
                  setShowProductPicker(false);
                }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#1E293B" }}>{p.name}</Text>
                  <Text style={{ fontSize: 12, color: "#7C3AED" }}>{formatCurrency(p.rate)} / {p.unit}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowProductPicker(false)}>
              <Text style={s.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  back: { marginBottom: 8 },
  backText: { color: "#7C3AED", fontWeight: "600", fontSize: 14 },
  title: { fontSize: 22, fontWeight: "800", color: "#1E1B4B", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 11, fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 13, fontSize: 14, color: "#1E293B", marginBottom: 12 },
  pickerBtn: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 13 },
  pickerSelected: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
  pickerPlaceholder: { fontSize: 14, color: "#94A3B8" },
  productPickBtn: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 10, marginRight: 8 },
  itemGrid: { flexDirection: "row", gap: 8 },
  itemField: { flex: 1 },
  fieldLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  smallInput: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 10, padding: 9, fontSize: 13, color: "#1E293B", textAlign: "center" },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totLabel: { fontSize: 13, color: "#64748B" },
  totVal: { fontSize: 13, color: "#1E293B", fontWeight: "600" },
  methodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1.5, borderColor: "transparent" },
  methodChipActive: { backgroundColor: "#EDE9FE", borderColor: "#7C3AED" },
  methodText: { fontSize: 12, color: "#64748B", fontWeight: "600", textTransform: "capitalize" },
  methodTextActive: { color: "#7C3AED" },
  createBtn: { backgroundColor: "#7C3AED", borderRadius: 14, padding: 18, alignItems: "center", marginTop: 8 },
  createBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cancelBtn: { marginTop: 12, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "600" },
});
