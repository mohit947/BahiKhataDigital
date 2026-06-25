export default function InventoryLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-10 w-full bg-slate-200 rounded-lg" />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-12 bg-slate-100 border-b border-slate-200" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-40 bg-slate-200 rounded flex-1" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
