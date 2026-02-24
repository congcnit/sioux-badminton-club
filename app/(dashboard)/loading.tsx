function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <LoadingBlock className="h-8 w-48" />
        <LoadingBlock className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LoadingBlock className="h-32" />
        <LoadingBlock className="h-32" />
        <LoadingBlock className="h-32" />
        <LoadingBlock className="h-32" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LoadingBlock className="h-80" />
        <LoadingBlock className="h-80" />
      </div>

      <LoadingBlock className="h-96" />
    </section>
  );
}
