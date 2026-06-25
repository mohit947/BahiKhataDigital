import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { productsApi } from "../../lib/api";
import { Product } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";

export default function InventoryScreen() {
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["products", search],
    queryFn: () => productsApi.list({ search: search || undefined, active_only: true }),
  });

  return (
    <View style={s.bg}>
      <View style={s.topBar}>
        <TextInput
          style={s.search} placeholder="Search name, SKU, category…"
          value={search} onChangeText={setSearch} placeholderTextColor="#94A3B8"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onRefresh={refetch} refreshing={isLoading}
          ListEmptyComponent={<Text style={s.empty}>No products yet</Text>}
          renderItem={({ item: p }) => (
            <View style={s.card}>
              <View style={s.iconBox}>
                <Text style={{ fontSize: 20 }}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{p.name}</Text>
                {p.category && <Text style={s.sub}>{p.category}</Text>}
                <Text style={s.unit}>per {p.unit}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.rate}>{formatCurrency(p.rate)}</Text>
                {p.gst_rate > 0 && (
                  <Text style={s.gst}>GST {p.gst_rate}%</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  topBar: { padding: 16, paddingBottom: 12 },
  search: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1E293B", borderWidth: 1.5, borderColor: "#E2E8F0" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  sub: { fontSize: 12, color: "#7C3AED", marginTop: 2 },
  unit: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  rate: { fontSize: 16, fontWeight: "800", color: "#1E1B4B" },
  gst: { fontSize: 11, color: "#64748B", marginTop: 2 },
  empty: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 14 },
});
