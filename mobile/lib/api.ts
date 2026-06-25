import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// localhost works on simulators; use your Mac's LAN IP for physical devices
// Production: set to your deployed backend URL
const DEV_HOST = "10.130.151.184"; // auto-detected local IP
const API_URL = __DEV__
  ? `http://${DEV_HOST}:8000/api/v1`
  : "http://localhost:8000/api/v1";

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("bahikhatadigital_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("bahikhatadigital_token");
      await AsyncStorage.removeItem("bahikhatadigital_user");
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
};

export const billsApi = {
  list: (params?: { search?: string; status?: string }) =>
    api.get("/bills/", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/bills/${id}`).then((r) => r.data),
  stats: () => api.get("/bills/stats").then((r) => r.data),
  report: (params: { date_from: string; date_to: string }) =>
    api.get("/bills/report", { params }).then((r) => r.data),
  create: (data: unknown) => api.post("/bills/", data).then((r) => r.data),
  addPayment: (id: string, data: { amount: number; method: string; note?: string }) =>
    api.post(`/bills/${id}/payments`, data).then((r) => r.data),
  cancel: (id: string) => api.post(`/bills/${id}/cancel`).then((r) => r.data),
};

export const customersApi = {
  list: (params?: { search?: string }) =>
    api.get("/customers/", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/customers/", data).then((r) => r.data),
};

export const productsApi = {
  list: (params?: { search?: string; active_only?: boolean }) =>
    api.get("/products/", { params }).then((r) => r.data),
};

export const suppliersApi = {
  list: (params?: { search?: string }) =>
    api.get("/suppliers/", { params }).then((r) => r.data),
  create: (data: unknown) => api.post("/suppliers/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/suppliers/${id}`, data).then((r) => r.data),
};

export const staffApi = {
  list: (params?: { search?: string }) =>
    api.get("/staff/", { params }).then((r) => r.data),
  create: (data: unknown) => api.post("/staff/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/staff/${id}`, data).then((r) => r.data),
};

export const expensesApi = {
  list: (params?: { date_from?: string; date_to?: string; category?: string }) =>
    api.get("/expenses/", { params }).then((r) => r.data),
  stats: (params: { date_from: string; date_to: string }) =>
    api.get("/expenses/stats", { params }).then((r) => r.data),
  create: (data: unknown) => api.post("/expenses/", data).then((r) => r.data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};
