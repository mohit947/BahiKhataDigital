"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BillForm from "@/components/BillForm";
import { useT } from "@/lib/i18n";
import { ReceiptText, Copy } from "lucide-react";

function NewBillContent() {
  const searchParams = useSearchParams();
  const { t } = useT();
  const fromBillId = searchParams.get("from") || undefined;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            {fromBillId
              ? <Copy className="text-purple-600" size={20} />
              : <ReceiptText className="text-purple-600" size={20} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {fromBillId ? t("duplicateBillTitle") : t("createBill")}
            </h1>
            <p className="text-gray-500 text-sm">
              {fromBillId ? t("editDuplicateDesc") : t("searchProductsDesc")}
            </p>
          </div>
        </div>
      </div>
      <BillForm fromBillId={fromBillId} />
    </div>
  );
}

export default function NewBillPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    }>
      <NewBillContent />
    </Suspense>
  );
}
