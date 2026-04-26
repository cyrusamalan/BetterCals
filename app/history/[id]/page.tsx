'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import BloodTestDashboard from '@/components/BloodTestDashboard';
import type { AnalysisHistory } from '@/types';
import { normalizeUserProfile } from '@/lib/profileUtils';
import { AnalysisDetailSkeleton } from '@/components/Skeleton';

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    fetch(`/api/analyses/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Analysis not found.' : 'Failed to load analysis.');
        return res.json();
      })
      .then((data: AnalysisHistory) =>
        setAnalysis({
          ...data,
          profile: normalizeUserProfile(data.profile),
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isLoaded, isSignedIn]);

  if (isLoaded && !isSignedIn) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-5"
        style={{ background: 'var(--page-gradient-simple)' }}
      >
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
            Sign in to view analysis history.
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

  if (loading || !isLoaded) {
    return <AnalysisDetailSkeleton />;
  }

  if (error || !analysis) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-5"
        style={{ background: 'var(--page-gradient-simple)' }}
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

  async function handleDeleteAnalysis() {
    if (!analysis) return;

    const shouldDelete = window.confirm('Remove this saved lab report? This cannot be undone.');
    if (!shouldDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/analyses/${analysis.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete analysis (${response.status})`);
      }
      router.push('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete analysis.');
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fixed right-4 bottom-4 md:bottom-auto md:top-24 z-40">
        <button
          type="button"
          onClick={handleDeleteAnalysis}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--status-danger)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete Report'}
        </button>
      </div>
      <BloodTestDashboard
        result={analysis.result}
        markers={analysis.markers}
        profile={analysis.profile}
        onReset={() => router.push('/history')}
        resetLabel="Back to History"
      />
    </>
  );
}
