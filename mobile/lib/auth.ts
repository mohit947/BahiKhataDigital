import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "./types";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("bahikhatadigital_token");
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem("bahikhatadigital_user");
  return raw ? JSON.parse(raw) : null;
}

export async function saveAuth(token: string, user: User) {
  await AsyncStorage.setItem("bahikhatadigital_token", token);
  await AsyncStorage.setItem("bahikhatadigital_user", JSON.stringify(user));
}

export async function clearAuth() {
  await AsyncStorage.removeItem("bahikhatadigital_token");
  await AsyncStorage.removeItem("bahikhatadigital_user");
}
