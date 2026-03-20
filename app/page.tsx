'use client';

import { useEffect, useState } from 'react';
import { Heart, Activity, FileText, Droplets, ChevronRight } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import TDEEForm from '@/components/TDEEForm';
import BloodReportUploader from '@/components/BloodReportUploader';
import BloodValuesForm from '@/components/BloodValuesForm';
import BloodTestDashboard from '@/components/BloodTestDashboard';
import BetterCalsMark from '@/components/BetterCalsMark';
import Link from 'next/link';
import {
  UserProfile,
  BloodMarkers,
  AnalysisResult
} from '@/types';
import {
  calculateTDEE,
  calculateHealthScore,
  generateInsights,
  identifyDeficiencies,
  identifyRisks,
  calculateCalorieTiers,
  calculateMacros,
  calculateRecommendations,
  calculateASCVDRiskScore,
} from '@/lib/calculations';
import { parseBloodReport } from '@/lib/bloodParser';
import { estimateAverageMarkers } from '@/lib/averageMarkers';

type Step = 'profile' | 'blood' | 'results';

function sanitizeBloodMarkers(input: BloodMarkers): BloodMarkers {
  const cleaned: BloodMarkers = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      cleaned[key as keyof BloodMarkers] = value;
    }
  }
  return cleaned;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [markers, setMarkers] = useState<BloodMarkers>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { isSignedIn, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      const savedStep = localStorage.getItem('bettercals_step');
      const savedProfile = localStorage.getItem('bettercals_profile');
      const savedMarkers = localStorage.getItem('bettercals_markers');
      const savedResult = localStorage.getItem('bettercals_result');

      if (savedStep === 'profile' || savedStep === 'blood' || savedStep === 'results') {
        setStep(savedStep);
      }
      if (savedProfile) setProfile(JSON.parse(savedProfile) as UserProfile);
      if (savedMarkers) setMarkers(JSON.parse(savedMarkers) as BloodMarkers);
      if (savedResult) setResult(JSON.parse(savedResult) as AnalysisResult);
    } catch {
      // If localStorage is corrupted, fail safe and start fresh.
      try {
        localStorage.removeItem('bettercals_step');
        localStorage.removeItem('bettercals_profile');
        localStorage.removeItem('bettercals_markers');
        localStorage.removeItem('bettercals_result');
      } catch {
        // ignore
      }
    } finally {
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('bettercals_step', step);
      localStorage.setItem('bettercals_profile', JSON.stringify(profile));
      localStorage.setItem('bettercals_markers', JSON.stringify(markers));
      localStorage.setItem('bettercals_result', JSON.stringify(result));
    } catch {
      // ignore (storage quota / blocked storage)
    }
  }, [isMounted, step, profile, markers, result]);

  const handleProfileSubmit = (data: UserProfile) => {
    setProfile(data);
    setStep('blood');
  };

  const handleBloodTextExtracted = (text: string) => {
    const parsed = sanitizeBloodMarkers(parseBloodReport(text));
    setMarkers(parsed);
  };

  const handleBloodSubmit = (data: BloodMarkers) => {
    const normalizedCurrentMarkers = sanitizeBloodMarkers(markers);
    const normalizedSubmittedMarkers = sanitizeBloodMarkers(data);
    let mergedMarkers = { ...normalizedCurrentMarkers, ...normalizedSubmittedMarkers };
    const usedAverageMarkers = Object.keys(mergedMarkers).length === 0;

    if (usedAverageMarkers) {
      mergedMarkers = profile ? estimateAverageMarkers(profile) : {};
    }

    setMarkers(mergedMarkers);

    if (profile) {
      const tdee = calculateTDEE(profile);
      const healthScore = calculateHealthScore(mergedMarkers, { gender: profile.gender });
      const insights = usedAverageMarkers ? [] : generateInsights(profile, tdee, mergedMarkers);
      const deficiencies = usedAverageMarkers ? [] : identifyDeficiencies(mergedMarkers, profile);
      const ascvdRiskScore = usedAverageMarkers ? undefined : calculateASCVDRiskScore(profile, mergedMarkers) ?? undefined;

      setResult({
        tdee,
        healthScore,
        insights,
        deficiencies,
        risks: usedAverageMarkers ? [] : identifyRisks(mergedMarkers, profile),
        calorieTiers: calculateCalorieTiers(tdee.tdee),
        macros: calculateMacros(tdee.targetCalories, profile.goal),
        recommendations: calculateRecommendations(profile, mergedMarkers, deficiencies),
        ascvdRiskScore,
        usedAverageMarkers,
      });

      setStep('results');
    }
  };

  const handleReset = () => {
    setStep('profile');
    setProfile(null);
    setMarkers({});
    setResult(null);

    try {
      localStorage.removeItem('bettercals_step');
      localStorage.removeItem('bettercals_profile');
      localStorage.removeItem('bettercals_markers');
      localStorage.removeItem('bettercals_result');
    } catch {
      // ignore
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full"
          style={{
            /* Vibrant multi-color ring with a "C"-shaped green arc (conic-gradient + mask). */
            background:
              'conic-gradient(from 90deg,' +
              ' rgba(0,0,0,0) 0deg 80deg,' + // open side of the "C" (right side)
              ' #22c55e 80deg 220deg,' + // green "C" stroke
              ' #b8860b 220deg 300deg,' + // warm accent for the rest of the ring
              ' #a05a5a 300deg 360deg)', // rose accent for the remaining arc
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))',
            animation: 'spin 0.9s linear both',
            filter: 'saturate(1.2) brightness(1.08)',
          }}
        />
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ── Results: full-page dashboard takeover ──
  if (step === 'results' && result) {
    return (
      <BloodTestDashboard
        result={result}
        markers={markers}
        profile={profile!}
        onReset={handleReset}
      />
    );
  }

  // ── Steps 1 & 2: Wizard flow ──
  const steps = [
    { key: 'profile', label: 'Profile', num: 1 },
    { key: 'blood', label: 'Blood Report', num: 2 },
    { key: 'results', label: 'Results', num: 3 },
  ] as const;

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}
    >
      {/* ── Header ── */}
      <header
        className="anim-fade-up sticky top-0 z-30"
        style={{
          backgroundColor: 'rgba(246, 245, 241, 0.72)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          borderBottom: '1px solid rgba(228, 226, 220, 0.5)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 flex items-center justify-center"
              style={{ background: 'transparent' }}
            >
              <BetterCalsMark className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                BetterCals
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Step pills */}
            <div className="hidden sm:flex items-center gap-1">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300"
                    style={{
                      backgroundColor: i <= currentStepIdx ? 'var(--accent-subtle)' : 'transparent',
                      color: i <= currentStepIdx ? 'var(--accent)' : 'var(--text-tertiary)',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                      style={{
                        backgroundColor: i <= currentStepIdx ? 'var(--accent)' : 'var(--border)',
                        color: i <= currentStepIdx ? 'var(--text-inverse)' : 'var(--text-tertiary)',
                        boxShadow: i === currentStepIdx ? '0 0 0 3px rgba(107, 143, 113, 0.15)' : 'none',
                      }}
                    >
                      {i < currentStepIdx ? '\u2713' : s.num}
                    </span>
                    {s.label}
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight className="w-3 h-3" style={{ color: 'var(--border)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Auth */}
            {!isSignedIn ? (
              <Link
                href="/sign-in"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press"
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: 'var(--text-inverse)',
                  boxShadow: '0 2px 6px rgba(107, 143, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press disabled:opacity-50"
                style={{
                  background: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-3xl mx-auto px-5 pt-8 pb-20">
        {step === 'profile' && (
          <div className="anim-fade-up delay-1">
            {/* Hero text */}
            <div className="mb-8 anim-fade-up delay-2">
              <h2
                className="font-display text-3xl sm:text-4xl leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Let&apos;s get to know you
              </h2>
              <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
                We&apos;ll calculate your daily calorie needs using the Mifflin-St Jeor equation.
              </p>
            </div>

            {/* Form container */}
            <div className="grid grid-cols-1 gap-8 items-start">
              {/* Form card */}
              <div
                className="relative overflow-hidden rounded-3xl noise anim-fade-up delay-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.72)',
                  backdropFilter: 'blur(20px) saturate(1.3)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
                }}
              >
                <div className="p-6 sm:p-8">
                  <TDEEForm onSubmit={handleProfileSubmit} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'blood' && (
          <div className="anim-fade-up delay-1">
            {/* Hero text */}
            <div className="mb-8 anim-fade-up delay-2">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setStep('profile')}
                  className="text-xs font-medium px-2 py-0.5 rounded-md btn-press"
                  style={{
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'var(--border-light)',
                  }}
                >
                  Back to Profile
                </button>
              </div>
              <h2
                className="font-display text-3xl sm:text-4xl leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Your blood report
              </h2>
              <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
                Upload a report for automatic extraction, or enter values manually.
              </p>
            </div>

            {/* Upload card */}
            <div
              className="relative overflow-hidden rounded-3xl noise anim-fade-up delay-3"
              style={{
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(20px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <div className="p-6 sm:p-8">
                <BloodReportUploader onTextExtracted={handleBloodTextExtracted} />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8 anim-fade-in delay-4">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                or enter manually
              </span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
            </div>

            {/* Manual entry card */}
            <div
              className="relative overflow-hidden rounded-3xl noise anim-fade-up delay-5"
              style={{
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(20px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <FileText className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Manual Entry
                  </h3>
                </div>
                <BloodValuesForm
                  onSubmit={handleBloodSubmit}
                  initialValues={markers}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-6"
        style={{ borderTop: '1px solid var(--border-light)' }}
      >
        <div className="max-w-3xl mx-auto px-5 text-center">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            BetterCals provides estimates for informational purposes only.
            Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
