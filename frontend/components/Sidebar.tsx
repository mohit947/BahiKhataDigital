"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package, ReceiptText, LayoutDashboard, LogOut, Menu, X,
  Plus, Users, ChevronRight, BarChart2, Truck, UserCog, Receipt
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuth, getUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { User } from "@/lib/types";

function NavLink({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/8"
      )}
    >
      <Icon size={17} className={active ? "text-white" : "text-slate-500 group-hover:text-slate-300"} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight size={14} className="opacity-60" />}
    </Link>
  );
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { t, lang, setLang } = useT();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const navGroups = [
    {
      label: t("nav_main"),
      items: [{ href: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard }],
    },
    {
      label: t("nav_billing"),
      items: [
        { href: "/bills/new", label: t("nav_newBill"), icon: Plus },
        { href: "/bills", label: t("nav_allBills"), icon: ReceiptText },
      ],
    },
    {
      label: t("nav_records"),
      items: [
        { href: "/customers", label: t("nav_customers"), icon: Users },
        { href: "/inventory", label: t("nav_inventory"), icon: Package },
        { href: "/suppliers", label: "Suppliers", icon: Truck },
        { href: "/staff", label: "Staff", icon: UserCog },
        { href: "/expenses", label: "Expenses", icon: Receipt },
        { href: "/reports", label: t("nav_reports"), icon: BarChart2 },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === "/bills" ? pathname === "/bills" : pathname.startsWith(href);

  const handleLogout = () => {
    qc.clear();
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">BahiKhataDigital</p>
            <p className="text-slate-400 text-xs">Billing System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onClick={onNav}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Language toggle */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setLang("en")}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition",
              lang === "en" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLang("hi")}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition",
              lang === "hi" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            हिं
          </button>
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg bg-white/5">
          <div className="w-7 h-7 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold" suppressHydrationWarning>
              {user?.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {user?.organization?.name && (
              <p className="text-slate-500 text-xs truncate leading-tight" suppressHydrationWarning>
                {user.organization.name}
              </p>
            )}
            <p className="text-white text-xs font-semibold truncate" suppressHydrationWarning>
              {user?.name || ""}
            </p>
            <p className="text-slate-500 text-xs capitalize" suppressHydrationWarning>
              {user?.role || ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
        >
          <LogOut size={16} />
          {t("nav_signOut")}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-md lg:hidden no-print"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden no-print" onClick={() => setOpen(false)} />
      )}

      {/* Mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-300 lg:hidden no-print",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onNav={() => setOpen(false)} />
      </aside>

      {/* Desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col no-print">
        <SidebarContent />
      </aside>
    </>
  );
}
