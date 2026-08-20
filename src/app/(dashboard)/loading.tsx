export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading">
      <div className="h-8 w-56 animate-shimmer rounded-md" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-shimmer rounded-lg border border-border"
          />
        ))}
      </div>

      <div className="h-80 animate-shimmer rounded-lg border border-border" />
    </div>
  );
}
