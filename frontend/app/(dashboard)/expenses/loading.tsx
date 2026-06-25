export default function ExpensesLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 bg-slate-200 rounded-lg" />
        <div className="h-10 w-36 bg-slate-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-slate-200 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-6 w-24 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-14 w-full bg-slate-200 rounded-xl" />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-12 bg-slate-100 border-b border-slate-200" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 flex-1 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded-full" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
