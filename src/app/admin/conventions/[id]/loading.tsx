export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded border p-4">
          <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
          <div className="space-y-2">
            {[...Array(4)].map((__, j) => <div key={j} className="h-7 bg-gray-100 rounded" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
