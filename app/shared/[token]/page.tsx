'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnalysisResult, BloodMarkers, UserProfile } from '@/types';
import BloodTestDashboard from '@/components/BloodTestDashboard';
import { SkeletonCard, SkeletonChart, SkeletonText } from '@/components/dashboard/Skeleton';

export default function SharedResultsPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{
    profile: UserProfile;
    markers: BloodMarkers;
    result: AnalysisResult;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/shared/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Not found');
        }
        return res.json();
      })
      .then((row) => {
        setData({
          profile: row.profile as UserProfile,
          markers: row.markers as BloodMarkers,
          result: row.result as AnalysisResult,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <SkeletonText width="w-64" />
        <SkeletonText width="w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonChart />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="rounded-2xl p-8 text-center max-w-md"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Shared Report Not Found
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This link may have expired or is invalid. Ask the owner for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BloodTestDashboard
      result={data.result}
      markers={data.markers}
      profile={data.profile}
      onReset={() => { window.location.href = '/'; }}
      resetLabel="Start Your Own Analysis"
    />
  );
}
