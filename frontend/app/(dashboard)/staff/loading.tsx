export default function StaffLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-10 w-full bg-slate-200 rounded-lg" />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-12 bg-slate-100 border-b border-slate-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100">
            <div className="w-9 h-9 bg-slate-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-5 w-14 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
