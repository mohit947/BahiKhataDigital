import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";

const ITEMS = [
  { label: "Inventory", emoji: "📦", desc: "Products & stock", href: "/(tabs)/inventory" },
  { label: "Suppliers", emoji: "🚚", desc: "Vendor & supplier list", href: "/(tabs)/suppliers" },
  { label: "Staff", emoji: "👔", desc: "Team members & salaries", href: "/(tabs)/staff" },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 20 }}>
      <Text style={s.heading}>More Sections</Text>
      {ITEMS.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={s.card}
          onPress={() => router.push(item.href as never)}
        >
          <Text style={s.emoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{item.label}</Text>
            <Text style={s.desc}>{item.desc}</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F8FAFC" },
  heading: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12, gap: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  emoji: { fontSize: 28 },
  label: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  desc: { fontSize: 13, color: "#64748B", marginTop: 2 },
  arrow: { fontSize: 22, color: "#CBD5E1", fontWeight: "300" },
});
