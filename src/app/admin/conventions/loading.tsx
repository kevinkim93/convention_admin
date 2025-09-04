export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded" />
      <div className="rounded border p-4">
        <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    </div>
  );
}
