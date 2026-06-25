import { Tabs } from "expo-router";
import { View, Text } from "react-native";

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 4 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, color: focused ? "#7C3AED" : "#94A3B8", fontWeight: focused ? "700" : "400", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#7C3AED" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#E2E8F0", height: 70, paddingBottom: 8 },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon label="Home" emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: "Bills",
          tabBarIcon: ({ focused }) => <TabIcon label="Bills" emoji="🧾" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ focused }) => <TabIcon label="Customers" emoji="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ focused }) => <TabIcon label="Expenses" emoji="💸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => <TabIcon label="Reports" emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon label="More" emoji="☰" focused={focused} />,
        }}
      />
      {/* Hidden from tab bar — routable via router.push */}
      <Tabs.Screen name="inventory" options={{ href: null, title: "Inventory" }} />
      <Tabs.Screen name="suppliers" options={{ href: null, title: "Suppliers" }} />
      <Tabs.Screen name="staff" options={{ href: null, title: "Staff" }} />
    </Tabs>
  );
}
