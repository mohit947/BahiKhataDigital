export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-slate-200 rounded-lg" />
      <div className="flex gap-4">
        <div className="h-10 w-40 bg-slate-200 rounded-lg" />
        <div className="h-10 w-40 bg-slate-200 rounded-lg" />
        <div className="h-10 w-28 bg-slate-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm h-72" />
    </div>
  );
}
