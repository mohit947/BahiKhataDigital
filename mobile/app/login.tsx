import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../lib/api";
import { saveAuth } from "../lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Enter email and password"); return; }
    setLoading(true);
    try {
      const data = await authApi.login(email.trim(), password);
      await saveAuth(data.access_token, data.user);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.bg} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <View style={s.logoBox}>
          <Text style={s.logoText}>V</Text>
        </View>
        <Text style={s.title}>BahiKhataDigital</Text>
        <Text style={s.subtitle}>Sign in to your account</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input} value={email} onChangeText={setEmail}
          placeholder="you@example.com" keyboardType="email-address"
          autoCapitalize="none" autoCorrect={false}
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input} value={password} onChangeText={setPassword}
          placeholder="••••••••" secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F5F3FF", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 28, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  logoBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center" },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#1E1B4B", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginBottom: 24, marginTop: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, color: "#1E293B" },
  btn: { backgroundColor: "#7C3AED", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
