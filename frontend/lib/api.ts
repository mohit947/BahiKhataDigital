import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bahikhatadigital_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("bahikhatadigital_token");
      localStorage.removeItem("bahikhatadigital_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (data: unknown) => api.post("/auth/register", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  inviteUser: (data: unknown) => api.post("/auth/invite", data).then((r) => r.data),
  updateOrg: (data: unknown) => api.put("/auth/org", data).then((r) => r.data),
  listOrgUsers: () => api.get("/auth/users").then((r) => r.data),
};

export const productsApi = {
  list: (params?: { search?: string; category?: string; active_only?: boolean }) =>
    api.get("/products/", { params }).then((r) => r.data),
  categories: () => api.get("/products/categories/").then((r) => r.data),
  create: (data: unknown) => api.post("/products/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/products/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/products/${id}`),
  get: (id: string) => api.get(`/products/${id}`).then((r) => r.data),
};

export const billsApi = {
  list: (params?: { search?: string; status?: string; date_from?: string; date_to?: string }) =>
    api.get("/bills/", { params }).then((r) => r.data),
  stats: () => api.get("/bills/stats").then((r) => r.data),
  report: (params: { date_from: string; date_to: string }) =>
    api.get("/bills/report", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/bills/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/bills/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/bills/${id}`, data).then((r) => r.data),
  addPayment: (id: string, data: { amount: number; method: string; note?: string }) =>
    api.post(`/bills/${id}/payments`, data).then((r) => r.data),
  cancel: (id: string) => api.post(`/bills/${id}/cancel`).then((r) => r.data),
  duplicate: (id: string) => api.post(`/bills/${id}/duplicate`).then((r) => r.data),
  applyCredit: (id: string) => api.post(`/bills/${id}/apply-credit`).then((r) => r.data),
  qrData: (id: string) => api.get(`/bills/${id}/qr-data`).then((r) => r.data),
};

export const customersApi = {
  list: (params?: { search?: string }) =>
    api.get("/customers/", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/customers/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/customers/${id}`, data).then((r) => r.data),
};

export const suppliersApi = {
  list: (params?: { search?: string; active_only?: boolean }) =>
    api.get("/suppliers/", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/suppliers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/suppliers/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/suppliers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const staffApi = {
  list: (params?: { search?: string; active_only?: boolean }) =>
    api.get("/staff/", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/staff/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/staff/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/staff/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/staff/${id}`),
};

export const expensesApi = {
  list: (params?: { date_from?: string; date_to?: string; category?: string }) =>
    api.get("/expenses/", { params }).then((r) => r.data),
  stats: (params: { date_from: string; date_to: string }) =>
    api.get("/expenses/stats", { params }).then((r) => r.data),
  create: (data: unknown) => api.post("/expenses/", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/expenses/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  categories: () => api.get("/expenses/categories").then((r) => r.data),
};
