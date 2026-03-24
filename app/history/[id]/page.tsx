'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import BloodTestDashboard from '@/components/BloodTestDashboard';
import type { AnalysisHistory } from '@/types';

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setError('Sign in to view analysis history.');
      setLoading(false);
      return;
    }

    fetch(`/api/analyses/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Analysis not found.' : 'Failed to load analysis.');
        return res.json();
      })
      .then((data) => setAnalysis(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isLoaded, isSignedIn]);

  if (loading || !isLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-5"
        style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}
      >
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
            {error || 'Analysis not found.'}
          </p>
          <button
            onClick={() => router.push('/history')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-press"
            style={{
              background: 'var(--border-light)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <BloodTestDashboard
      result={analysis.result}
      markers={analysis.markers}
      profile={analysis.profile}
      onReset={() => router.push('/history')}
      resetLabel="Back to History"
    />
  );
}
