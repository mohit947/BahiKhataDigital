import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import { getToken } from "../lib/auth";

const qc = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getToken().then((t) => {
      setAuthed(!!t);
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!checked) return;
    const inAuth = segments[0] === "login";
    if (!authed && !inAuth) router.replace("/login");
    if (authed && inAuth) router.replace("/(tabs)");
  }, [authed, checked, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </QueryClientProvider>
  );
}
