"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { Product } from "@/lib/types";
import { Search, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  onSelect: (product: Product) => void;
}

export default function ProductSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", "search", query],
    queryFn: () => productsApi.list({ search: query || undefined, active_only: true }),
    enabled: open,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search product by name or SKU…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); }}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {products.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              {query ? `No products found for "${query}"` : "Start typing to search…"}
            </div>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-50 text-left transition border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-400">
                    {product.sku ? `SKU: ${product.sku} · ` : ""}
                    {product.unit}
                    {product.category ? ` · ${product.category}` : ""}
                    {product.gst_rate > 0 ? ` · GST ${product.gst_rate}%` : ""}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-bold text-purple-700">{formatCurrency(product.rate)}</p>
                  <p className="text-xs text-gray-400">/{product.unit}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
