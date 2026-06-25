export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm h-64" />
        <div className="bg-white rounded-xl p-5 shadow-sm h-64" />
      </div>
    </div>
  );
}
