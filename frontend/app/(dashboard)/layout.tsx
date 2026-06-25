"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/lib/i18n";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  return (
    <LanguageProvider>
      <div className="min-h-screen flex bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-60 min-h-screen">
          <div className="px-4 py-5 sm:px-6 lg:px-8 pt-16 lg:pt-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </LanguageProvider>
  );
}
