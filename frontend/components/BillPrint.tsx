"use client";
import { useRef, forwardRef } from "react";
import QRCode from "react-qr-code";
import { Bill } from "@/lib/types";
import { formatCurrency, formatDateTime, numberToWords } from "@/lib/utils";

const COMPANY = {
  name: "BahiKhataDigital",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Your Address Here",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "+91-XXXXXXXXXX",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "contact@vanyatraders.com",
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN || "GSTIN_NUMBER",
  upiId: process.env.NEXT_PUBLIC_UPI_ID || "vanyatraders@upi",
};

interface Props {
  bill: Bill;
  upiLink?: string;
}

const BillPrint = forwardRef<HTMLDivElement, Props>(({ bill, upiLink }, ref) => {
  const gstSummary = bill.items.reduce((acc, item) => {
    const rate = Number(item.gst_percent);
    if (!acc[rate]) acc[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
    const taxable = Number(item.total) - Number(item.gst_amount);
    acc[rate].taxable += taxable;
    acc[rate].cgst += Number(item.gst_amount) / 2;
    acc[rate].sgst += Number(item.gst_amount) / 2;
    acc[rate].total += Number(item.gst_amount);
    return acc;
  }, {} as Record<number, { taxable: number; cgst: number; sgst: number; total: number }>);

  const paymentMethodLabel: Record<string, string> = {
    cash: "Cash", upi: "UPI", card: "Card",
    bank_transfer: "Bank Transfer", cheque: "Cheque",
  };

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 font-sans"
      style={{ width: "210mm", minHeight: "297mm", padding: "12mm 15mm", boxSizing: "border-box", fontSize: "11px" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-purple-700 pb-4 mb-4">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#7e22ce" }}>{COMPANY.name}</h1>
          <p className="text-gray-600 mt-0.5" style={{ fontSize: "10px" }}>{COMPANY.address}</p>
          <p className="text-gray-600" style={{ fontSize: "10px" }}>
            Ph: {COMPANY.phone} | Email: {COMPANY.email}
          </p>
          {COMPANY.gstin && (
            <p className="text-gray-700 font-medium mt-0.5" style={{ fontSize: "10px" }}>
              GSTIN: {COMPANY.gstin}
            </p>
          )}
        </div>
        <div className="text-right">
          <div
            style={{ fontSize: "15px", fontWeight: 700, color: "#7e22ce",
              border: "2px solid #7e22ce", padding: "4px 12px", borderRadius: "6px" }}
          >
            TAX INVOICE
          </div>
          <p className="mt-2 font-bold" style={{ fontSize: "12px" }}>
            Bill #: {bill.bill_number}
          </p>
          <p className="text-gray-500" style={{ fontSize: "10px" }}>
            Date: {formatDateTime(bill.created_at)}
          </p>
        </div>
      </div>

      {/* Billing Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="font-semibold text-gray-500 mb-1 uppercase" style={{ fontSize: "9px", letterSpacing: "0.05em" }}>
            Billed To
          </p>
          <p className="font-bold text-gray-900">{bill.customer_name || "Walk-in Customer"}</p>
          {bill.customer_phone && <p className="text-gray-600">Ph: {bill.customer_phone}</p>}
          {bill.customer_address && <p className="text-gray-600">{bill.customer_address}</p>}
          {bill.customer_gstin && <p className="text-gray-600">GSTIN: {bill.customer_gstin}</p>}
        </div>
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="font-semibold text-gray-500 mb-1 uppercase" style={{ fontSize: "9px", letterSpacing: "0.05em" }}>
            Payment Info
          </p>
          <div className="space-y-0.5">
            <p>Method: <span className="font-medium">{paymentMethodLabel[bill.payment_method] || bill.payment_method}</span></p>
            <p>Status:{" "}
              <span className={`font-bold ${
                bill.payment_status === "paid" ? "text-green-600" :
                bill.payment_status === "partial" ? "text-orange-500" : "text-red-600"
              }`}>
                {bill.payment_status.toUpperCase()}
              </span>
            </p>
            {Number(bill.amount_paid) > 0 && (
              <p>Paid: <span className="font-medium">{formatCurrency(bill.amount_paid)}</span></p>
            )}
            {bill.payment_status !== "paid" && (
              <p>Balance: <span className="font-bold text-red-600">
                {formatCurrency(Number(bill.grand_total) - Number(bill.amount_paid))}
              </span></p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-4" style={{ fontSize: "10px" }}>
        <thead>
          <tr style={{ backgroundColor: "#7e22ce", color: "white" }}>
            <th className="text-left py-2 px-2 rounded-tl-lg" style={{ width: "28px" }}>#</th>
            <th className="text-left py-2 px-2">Product / Description</th>
            <th className="text-center py-2 px-2" style={{ width: "40px" }}>Unit</th>
            <th className="text-right py-2 px-2" style={{ width: "40px" }}>Qty</th>
            <th className="text-right py-2 px-2" style={{ width: "70px" }}>Rate (₹)</th>
            <th className="text-right py-2 px-2" style={{ width: "50px" }}>Disc%</th>
            <th className="text-right py-2 px-2" style={{ width: "55px" }}>Disc (₹)</th>
            <th className="text-right py-2 px-2" style={{ width: "40px" }}>GST%</th>
            <th className="text-right py-2 px-2" style={{ width: "60px" }}>GST (₹)</th>
            <th className="text-right py-2 px-2 rounded-tr-lg" style={{ width: "75px" }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, idx) => (
            <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#faf5ff" : "white" }}>
              <td className="py-1.5 px-2 text-center text-gray-500">{idx + 1}</td>
              <td className="py-1.5 px-2 font-medium">{item.product_name}</td>
              <td className="py-1.5 px-2 text-center text-gray-600">{item.unit}</td>
              <td className="py-1.5 px-2 text-right">{Number(item.quantity)}</td>
              <td className="py-1.5 px-2 text-right">{Number(item.rate).toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right text-green-700">
                {Number(item.discount_percent) > 0 ? `${Number(item.discount_percent)}%` : "—"}
              </td>
              <td className="py-1.5 px-2 text-right text-green-700">
                {Number(item.discount_amount) > 0 ? Number(item.discount_amount).toFixed(2) : "—"}
              </td>
              <td className="py-1.5 px-2 text-right">{Number(item.gst_percent) > 0 ? `${Number(item.gst_percent)}%` : "—"}</td>
              <td className="py-1.5 px-2 text-right">{Number(item.gst_amount) > 0 ? Number(item.gst_amount).toFixed(2) : "—"}</td>
              <td className="py-1.5 px-2 text-right font-semibold">{Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bottom Section: GST Summary + Totals + QR */}
      <div className="grid grid-cols-3 gap-4 mt-2">
        {/* GST Summary */}
        <div className="col-span-1">
          {Object.keys(gstSummary).length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ fontSize: "9px" }}>
              <div className="bg-gray-100 px-3 py-1.5 font-semibold text-gray-700">GST Summary</div>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left px-2 py-1">Rate</th>
                    <th className="text-right px-2 py-1">Taxable</th>
                    <th className="text-right px-2 py-1">CGST</th>
                    <th className="text-right px-2 py-1">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstSummary).map(([rate, vals]) => (
                    <tr key={rate} className="border-t border-gray-100">
                      <td className="px-2 py-1">{rate}%</td>
                      <td className="px-2 py-1 text-right">{vals.taxable.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{vals.cgst.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{vals.sgst.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {bill.notes && (
            <div className="border border-gray-200 rounded-lg p-3 mt-2" style={{ fontSize: "9px" }}>
              <p className="font-semibold text-gray-500 mb-1">Notes</p>
              <p className="text-gray-700">{bill.notes}</p>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="col-span-1 flex flex-col items-center justify-center border border-gray-200 rounded-lg p-3">
          {upiLink && COMPANY.upiId ? (
            <>
              <QRCode value={upiLink} size={90} />
              <p className="text-center mt-1 text-gray-500" style={{ fontSize: "8px" }}>
                Scan to Pay via UPI
              </p>
              <p className="text-center font-medium text-purple-700" style={{ fontSize: "9px" }}>
                {COMPANY.upiId}
              </p>
            </>
          ) : (
            <p className="text-gray-400 text-center text-xs">UPI QR<br/>not configured</p>
          )}
        </div>

        {/* Totals */}
        <div className="col-span-1">
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ fontSize: "10px" }}>
            <div className="space-y-0">
              <div className="flex justify-between px-3 py-1.5 bg-gray-50">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(bill.subtotal)}</span>
              </div>
              {Number(bill.discount_total) > 0 && (
                <div className="flex justify-between px-3 py-1.5 text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatCurrency(bill.discount_total)}</span>
                </div>
              )}
              {Number(bill.gst_total) > 0 && (
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-gray-600">GST</span>
                  <span className="font-medium">+{formatCurrency(bill.gst_total)}</span>
                </div>
              )}
              <div
                className="flex justify-between px-3 py-2 font-bold"
                style={{ backgroundColor: "#7e22ce", color: "white", fontSize: "12px" }}
              >
                <span>GRAND TOTAL</span>
                <span>{formatCurrency(bill.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mt-2 border border-gray-200 rounded-lg p-2" style={{ fontSize: "9px" }}>
            <p className="text-gray-500 font-medium">Amount in Words:</p>
            <p className="text-gray-700 font-medium italic">
              {numberToWords(Number(bill.grand_total))}
            </p>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-gray-200">
        <div>
          <div className="border-b border-gray-400 mb-1 pb-10"></div>
          <p className="text-gray-600 font-medium" style={{ fontSize: "10px" }}>
            Receiver&apos;s Signature & Stamp
          </p>
          <p className="text-gray-400" style={{ fontSize: "9px" }}>
            I/We hereby confirm receipt of goods in good condition.
          </p>
        </div>
        <div className="text-right">
          <div className="border-b border-gray-400 mb-1 pb-10"></div>
          <p className="text-gray-600 font-medium" style={{ fontSize: "10px" }}>
            For {COMPANY.name}
          </p>
          <p className="text-gray-400" style={{ fontSize: "9px" }}>
            Authorised Signatory
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-2 border-t border-gray-100">
        <p className="text-gray-400" style={{ fontSize: "8px" }}>
          This is a computer-generated invoice. Thank you for your business with {COMPANY.name}!
        </p>
      </div>
    </div>
  );
});

BillPrint.displayName = "BillPrint";
export default BillPrint;
