"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { Customer } from "@/lib/types";
import { Search, X, UserPlus } from "lucide-react";

interface Props {
  selected?: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export default function CustomerSearch({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", "search", query],
    queryFn: () => customersApi.list({ search: query || undefined }),
    enabled: open,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-lg">
        <div className="w-8 h-8 bg-violet-200 rounded-full flex items-center justify-center shrink-0">
          <span className="text-violet-700 text-xs font-bold">{selected.name[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
          {selected.phone && <p className="text-xs text-slate-500">{selected.phone}</p>}
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-slate-400 hover:text-red-500 transition">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search existing customer by name or phone…"
          className="input-field pl-9"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {customers.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-400">{query ? `No customers found for "${query}"` : "Start typing to search…"}</p>
            </div>
          ) : (
            customers.map((c) => (
              <button key={c.id} type="button" onClick={() => { onSelect(c); setOpen(false); setQuery(""); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 text-left border-b border-slate-50 last:border-0 transition">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-slate-600 text-xs font-bold">{c.name[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone || c.email || "No contact info"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
