"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Organization } from "@/lib/types";
import { getUser, saveAuth, getToken } from "@/lib/auth";
import { toast } from "sonner";
import { Building2, Smartphone, QrCode, Upload, Trash2, Save } from "lucide-react";

export default function SettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState({
    name: "", gstin: "", address: "", phone: "", email: "", upi_id: "", upi_name: "",
  });
  const [customQrImage, setCustomQrImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getUser();
    if (user?.organization) {
      const o = user.organization;
      setOrg(o);
      setForm({
        name: o.name || "",
        gstin: o.gstin || "",
        address: o.address || "",
        phone: o.phone || "",
        email: o.email || "",
        upi_id: o.upi_id || "",
        upi_name: o.upi_name || "",
      });
    }
    const saved = localStorage.getItem("bahikhatadigital_custom_qr");
    if (saved) setCustomQrImage(saved);
  }, []);

  const updateOrgMutation = useMutation({
    mutationFn: (data: typeof form) => authApi.updateOrg(data),
    onSuccess: (updatedOrg: Organization) => {
      const user = getUser();
      const token = getToken();
      if (user && token) {
        user.organization = updatedOrg;
        saveAuth(token, user);
        setOrg(updatedOrg);
        setForm({
          name: updatedOrg.name || "",
          gstin: updatedOrg.gstin || "",
          address: updatedOrg.address || "",
          phone: updatedOrg.phone || "",
          email: updatedOrg.email || "",
          upi_id: updatedOrg.upi_id || "",
          upi_name: updatedOrg.upi_name || "",
        });
      }
      toast.success("Settings saved successfully");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save";
      toast.error(msg);
    },
  });

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCustomQrImage(dataUrl);
      localStorage.setItem("bahikhatadigital_custom_qr", dataUrl);
      toast.success("Custom QR image saved");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQr = () => {
    setCustomQrImage(null);
    localStorage.removeItem("bahikhatadigital_custom_qr");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Custom QR image removed");
  };

  const isAdmin = getUser()?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your firm details and billing preferences</p>
      </div>

      {/* Firm Details */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Building2 size={17} className="text-violet-500" /> Firm Details
        </h2>
        {!isAdmin && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            Only admins can edit firm details.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Firm Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleField}
              disabled={!isAdmin}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Your firm name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
              <input
                name="gstin"
                value={form.gstin}
                onChange={handleField}
                disabled={!isAdmin}
                className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleField}
                disabled={!isAdmin}
                className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleField}
              disabled={!isAdmin}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleField}
              disabled={!isAdmin}
              rows={2}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Full address"
            />
          </div>
        </div>
      </div>

      {/* UPI / Payment QR */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Smartphone size={17} className="text-violet-500" /> UPI Payment Details
        </h2>
        <p className="text-xs text-slate-500">
          These details are used to generate the payment QR code on invoices.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID</label>
            <input
              name="upi_id"
              value={form.upi_id}
              onChange={handleField}
              disabled={!isAdmin}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="yourname@upi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">UPI Display Name</label>
            <input
              name="upi_name"
              value={form.upi_name}
              onChange={handleField}
              disabled={!isAdmin}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Your Firm Name"
            />
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => updateOrgMutation.mutate(form)}
            disabled={updateOrgMutation.isPending || !form.name.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={15} />
            {updateOrgMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      {/* Custom QR Code */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <QrCode size={17} className="text-violet-500" /> Custom QR Code
        </h2>
        <p className="text-xs text-slate-500">
          Upload your own QR code image (e.g., from your bank or payment app). This overrides the auto-generated UPI QR on all bills. Stored locally on this device.
        </p>

        {customQrImage ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={customQrImage}
              alt="Custom QR"
              className="w-28 h-28 border border-slate-200 rounded-lg object-contain bg-white p-1"
            />
            <div className="space-y-2">
              <p className="text-sm text-slate-600 font-medium">Custom QR active</p>
              <p className="text-xs text-slate-400">This QR will appear on all printed bills.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Upload size={13} /> Replace
                </button>
                <button
                  onClick={handleRemoveQr}
                  className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition cursor-pointer"
          >
            <Upload size={22} />
            <span className="text-sm font-medium">Upload QR Image</span>
            <span className="text-xs">PNG, JPG supported</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleQrUpload}
        />
      </div>

      {/* Org meta info */}
      {org && (
        <div className="text-xs text-slate-400 text-center pb-4">
          Org ID: {org.id} · Created: {new Date(org.created_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
