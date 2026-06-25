export default function CustomersLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-slate-200 rounded-lg" />
        <div className="h-10 w-36 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-10 w-full bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
