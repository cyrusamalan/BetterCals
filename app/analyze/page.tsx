'use client';

import { useEffect, useState } from 'react';
import { Heart, Activity, FileText, Droplets, ChevronRight, History } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import TDEEForm from '@/components/TDEEForm';
import BloodReportUploader from '@/components/BloodReportUploader';
import BloodValuesForm from '@/components/BloodValuesForm';
import BloodTestDashboard from '@/components/BloodTestDashboard';
import VitalsMark from '@/components/VitalsMark';
import ProfileDropdown from '@/components/ProfileDropdown';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import {
  UserProfile,
  BloodMarkers,
  AnalysisResult
} from '@/types';
import { isPlausibleValue } from '@/lib/bloodParser';
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
  deriveMarkers,
} from '@/lib/calculations';
import { estimateAverageMarkers } from '@/lib/averageMarkers';
import { normalizeUserProfile } from '@/lib/profileUtils';

type Step = 'profile' | 'blood' | 'results';

// #region debug log helper
const DEBUG_ENDPOINT = 'http://127.0.0.1:7498/ingest/6f0bd25c-93a7-48e3-a88d-41621d1baedd';
const DEBUG_SESSION_ID = 'dc8eb7';
function debugLog({
  hypothesisId,
  location,
  message,
  data,
}: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  try {
    fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        location,
        message,
        hypothesisId,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
// #endregion

function sanitizeBloodMarkers(input: BloodMarkers): BloodMarkers {
  const cleaned: BloodMarkers = {};
  for (const [key, value] of Object.entries(input)) {
    const k = key as keyof BloodMarkers;
    if (typeof value === 'number' && Number.isFinite(value) && isPlausibleValue(k, value)) {
      cleaned[k] = value;
    }
  }
  return cleaned;
}

export default function AnalyzePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [markers, setMarkers] = useState<BloodMarkers>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { isSignedIn, isLoaded: isAuthLoaded, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [serverProfileLoaded, setServerProfileLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedStep = localStorage.getItem('bettercals_step');
      const savedProfile = localStorage.getItem('bettercals_profile');
      const savedMarkers = localStorage.getItem('bettercals_markers');
      const savedResult = localStorage.getItem('bettercals_result');

      const parsedProfile = savedProfile ? normalizeUserProfile(JSON.parse(savedProfile) as UserProfile) : null;
      const parsedMarkers = savedMarkers ? JSON.parse(savedMarkers) as BloodMarkers : {};
      const parsedResult = savedResult ? JSON.parse(savedResult) as AnalysisResult : null;

      if (parsedProfile) setProfile(parsedProfile);
      if (savedMarkers) setMarkers(parsedMarkers);
      if (parsedResult) setResult(parsedResult);

      // Validate state coherence: only restore step if the required data exists
      if (savedStep === 'results' && parsedProfile && parsedResult) {
        setStep('results');
      } else if (savedStep === 'blood' && parsedProfile) {
        setStep('blood');
      } else {
        setStep('profile');
      }
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

  // Fetch server-saved profile for logged-in users → auto-skip to Step 2
  useEffect(() => {
    if (!isMounted || !isAuthLoaded) return;
    if (!isSignedIn) {
      setServerProfileLoaded(true);
      return;
    }

    fetch('/api/profile')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.profile) {
          setProfile(normalizeUserProfile(data.profile as UserProfile));
          if (step === 'profile') {
            setStep('blood');
          }
        }
      })
      .catch(() => {
        // silent — fall through to normal localStorage flow
      })
      .finally(() => setServerProfileLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, isAuthLoaded, isSignedIn]);

  const handleProfileSubmit = (data: UserProfile) => {
    setProfile(data);
    setStep('blood');

    if (isSignedIn) {
      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: data }),
      }).catch(() => {});
    }
  };

  const calculateResultWithoutBlood = (profileData: UserProfile) => {
    // #region debug log quick-start
    debugLog({
      hypothesisId: 'Q15_quickstart',
      location: 'app/analyze/page.tsx:calculateResultWithoutBlood',
      message: 'Quick-start calories path invoked',
      data: { goal: profileData.goal, gender: profileData.gender, age: profileData.age },
    });
    // #endregion

    const tdee = calculateTDEE(profileData);
    const emptyMarkers: BloodMarkers = {};
    const healthScore = calculateHealthScore(emptyMarkers, { gender: profileData.gender });

    setMarkers(emptyMarkers);
    setResult({
      tdee,
      healthScore,
      insights: [],
      deficiencies: [],
      risks: [],
      calorieTiers: calculateCalorieTiers(tdee.tdee),
      macros: calculateMacros(tdee.targetCalories, profileData.goal, profileData, emptyMarkers),
      recommendations: calculateRecommendations(profileData, emptyMarkers, []),
      ascvdRiskScore: undefined,
      ascvdRiskReason: 'Skipped blood markers',
      usedAverageMarkers: true,
    });
    setStep('results');
  };

  const handleMarkersExtracted = (extracted: BloodMarkers) => {
    setMarkers(sanitizeBloodMarkers(extracted));
  };

  const handleBloodSubmit = (data: BloodMarkers) => {
    const normalizedCurrentMarkers = sanitizeBloodMarkers(markers);
    const normalizedSubmittedMarkers = sanitizeBloodMarkers(data);
    let mergedMarkers = { ...normalizedCurrentMarkers, ...normalizedSubmittedMarkers };
    const usedAverageMarkers = Object.keys(mergedMarkers).length === 0;

    if (usedAverageMarkers) {
      mergedMarkers = profile ? estimateAverageMarkers(profile) : {};
    }

    // Derive computed lipids (Non-HDL + LDL fallback logic).
    const derived = deriveMarkers(mergedMarkers);
    mergedMarkers = { ...mergedMarkers, ...derived };

    setMarkers(mergedMarkers);

    if (profile) {
      const tdee = calculateTDEE(profile);
      const healthScore = calculateHealthScore(mergedMarkers, { gender: profile.gender });
      const insights = usedAverageMarkers ? [] : generateInsights(profile, tdee, mergedMarkers);
      const deficiencies = usedAverageMarkers ? [] : identifyDeficiencies(mergedMarkers, profile);
      const ascvdResult = usedAverageMarkers ? { risk: null, reason: undefined } : calculateASCVDRiskScore(profile, mergedMarkers);

      setResult({
        tdee,
        healthScore,
        insights,
        deficiencies,
        risks: usedAverageMarkers ? [] : identifyRisks(mergedMarkers, profile),
        calorieTiers: calculateCalorieTiers(tdee.tdee),
        macros: calculateMacros(tdee.targetCalories, profile.goal, profile, mergedMarkers),
        recommendations: calculateRecommendations(profile, mergedMarkers, deficiencies),
        ascvdRiskScore: ascvdResult.risk ?? undefined,
        ascvdRiskReason: ascvdResult.reason,
        usedAverageMarkers,
        derivedMarkers: derived,
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

  const handleEditProfile = () => {
    // Navigate back to step 1 with existing profile data preserved
    setStep('profile');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (!isMounted || !serverProfileLoaded) {
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

  // ── Results: full-page dashboard takeover ──
  // State coherence check: results step requires both profile and result.
  // If profile is missing (e.g. corrupted localStorage), fall back to profile step.
  if (step === 'results' && result && profile) {
    return (
      <BloodTestDashboard
        result={result}
        markers={markers}
        profile={profile}
        onReset={handleReset}
        onEditProfile={handleEditProfile}
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
        <div className="w-full px-5 py-3.5 grid grid-cols-[auto_1fr_auto] items-center">
          {/* Left: logo */}
          <div className="flex items-center gap-3 justify-start">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{ background: 'transparent' }}
            >
              <VitalsMark sizePx={34} />
            </div>
            <div>
              <h1
                className="text-[22px] font-bold font-display"
                style={{ color: 'var(--text-primary)' }}
              >
                BetterCals
              </h1>
            </div>
          </div>

          {/* Center: step pills (mobile: compact dots, desktop: full pills) */}
          <div className="flex sm:hidden items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div
                key={s.key}
                className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i <= currentStepIdx ? 'var(--accent)' : 'var(--border)',
                  boxShadow: i === currentStepIdx ? '0 0 0 3px rgba(107, 143, 113, 0.2)' : 'none',
                }}
              />
            ))}
          </div>
          <div className="hidden sm:flex flex-col items-center gap-1 justify-center">
            <div className="flex items-center gap-1">
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
                        boxShadow:
                          i === currentStepIdx ? '0 0 0 3px rgba(107, 143, 113, 0.15)' : 'none',
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
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Your progress is saved locally.
            </span>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {!isSignedIn ? (
              <Link
                href="/sign-in"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press"
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: 'var(--text-inverse)',
                  boxShadow:
                    '0 2px 6px rgba(107, 143, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                Sign in
              </Link>
              ) : profile ? (
                <>
                  <Link
                    href="/history"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-press"
                    style={{
                      background: 'var(--border-light)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <History className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    History
                  </Link>
                  <ProfileDropdown profile={profile} onEditProfile={handleEditProfile} />
                </>
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
              {profile && (
                <button
                  type="button"
                  onClick={() => calculateResultWithoutBlood(profile)}
                  className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg btn-press"
                  style={{
                    color: 'var(--accent)',
                    background: 'var(--accent-subtle)',
                    border: '1px solid rgba(107, 143, 113, 0.25)',
                  }}
                >
                  I just want calories
                </button>
              )}
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
                  <TDEEForm onSubmit={handleProfileSubmit} initialValues={profile ?? undefined} />
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
              {profile && (
                <button
                  type="button"
                  onClick={() => calculateResultWithoutBlood(profile)}
                  className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg btn-press"
                  style={{
                    color: 'var(--accent)',
                    background: 'var(--accent-subtle)',
                    border: '1px solid rgba(107, 143, 113, 0.25)',
                  }}
                >
                  I just want calories
                </button>
              )}
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
                <BloodReportUploader onMarkersExtracted={handleMarkersExtracted} />
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

