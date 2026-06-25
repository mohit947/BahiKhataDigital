export const formatCurrency = (v: number | string) =>
  "₹" + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const statusColor = (s: string) => {
  if (s === "paid") return { bg: "#D1FAE5", text: "#065F46" };
  if (s === "partial") return { bg: "#FEF3C7", text: "#92400E" };
  if (s === "cancelled") return { bg: "#F1F5F9", text: "#475569" };
  return { bg: "#FEE2E2", text: "#991B1B" };
};
