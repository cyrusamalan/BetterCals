export default function HistoryLoading() {
  return (
    <div className="min-h-screen px-5 py-8" style={{ background: 'var(--page-gradient-simple)' }}>
      <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
        <div className="h-10 w-56 rounded-xl" style={{ backgroundColor: 'var(--border-light)' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
