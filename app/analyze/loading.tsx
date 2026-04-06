export default function AnalyzeLoading() {
  return (
    <div className="min-h-screen px-5 py-8" style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}>
      <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
        <div className="h-10 w-48 rounded-xl" style={{ backgroundColor: 'var(--border-light)' }} />
        <div className="h-24 rounded-2xl" style={{ backgroundColor: 'var(--surface)' }} />
        <div className="h-56 rounded-3xl" style={{ backgroundColor: 'var(--surface)' }} />
      </div>
    </div>
  );
}
