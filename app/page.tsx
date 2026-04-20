'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowRight,
  Shield,
  Sparkles,
  Activity,
  HeartPulse,
  LineChart,
  History,
  Play,
} from 'lucide-react';
import VitalsMark from '@/components/VitalsMark';
import DemoModal from '@/components/DemoModal';

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl noise card-hover p-5 select-none"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid rgba(107, 143, 113, 0.22)' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  num,
  title,
  description,
}: {
  num: number;
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 select-none"
      style={{
        backgroundColor: 'var(--bg-warm)',
        border: '1px solid var(--border-light)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            color: 'var(--text-inverse)',
            boxShadow: '0 10px 18px rgba(107, 143, 113, 0.18)',
          }}
        >
          {num}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h4>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{
          backgroundColor: 'rgba(246, 245, 241, 0.72)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          borderBottom: '1px solid rgba(228, 226, 220, 0.5)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <VitalsMark sizePx={32} />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[18px] sm:text-[20px] font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                BetterCals
              </div>
              <div className="hidden sm:block text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Smart calories + blood marker insights
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {isSignedIn ? (
              <>
                <Link
                  href="/history"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-press"
                  style={{
                    background: 'var(--border-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <History className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  History
                </Link>
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                    color: 'var(--text-inverse)',
                    boxShadow: '0 2px 6px rgba(107, 143, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                    color: 'var(--text-inverse)',
                    boxShadow: '0 2px 6px rgba(107, 143, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  Sign up
                  <ArrowRight className="hidden sm:inline-block w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-5 pt-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="anim-fade-up">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none"
              style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(107, 143, 113, 0.22)' }}
            >
              <Sparkles className="w-4 h-4" />
              Personalized from your profile + labs
            </div>

            <h1
              className="font-display text-4xl sm:text-5xl leading-[1.05] mt-4 select-none"
              style={{ color: 'var(--text-primary)' }}
            >
              Understand your bloodwork and calories in minutes.
            </h1>
            <p className="text-base sm:text-lg mt-4 leading-relaxed select-none" style={{ color: 'var(--text-secondary)' }}>
              BetterCals turns your profile and lab markers into a simple health score, targeted insights, and a clear calorie + macro plan you can follow this week.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold btn-press"
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: 'var(--text-inverse)',
                  boxShadow: '0 16px 34px rgba(107, 143, 113, 0.18), inset 0 1px 0 rgba(255,255,255,0.16)',
                }}
              >
                Start free analysis
                <ArrowRight className="w-4 h-4" />
              </Link>

              {isSignedIn ? (
                <Link
                  href="/history"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold btn-press"
                  style={{
                    background: 'var(--border-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  View history
                  <LineChart className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                </Link>
              ) : (
                <button
                  onClick={() => setDemoOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold btn-press"
                  style={{
                    background: 'var(--border-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <Play className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  See it in action
                </button>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span className="inline-flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Progress saved locally by default
              </span>
              <span className="inline-flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Calorie targets + macros
              </span>
              <span className="inline-flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                Cardiovascular risk when eligible
              </span>
            </div>
          </div>

          <div className="anim-fade-up delay-1">
            <div
              className="relative overflow-hidden rounded-3xl noise p-6 sm:p-8"
              style={{
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(20px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                What you get
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                A clear plan, not a wall of numbers.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <FeatureCard
                  icon={<Activity className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
                  title="TDEE + target calories"
                  description="Maintenance calories and goal-based targets using the Mifflin-St Jeor equation."
                />
                <FeatureCard
                  icon={<HeartPulse className="w-5 h-5" style={{ color: 'var(--status-danger)' }} />}
                  title="Blood marker score + insights"
                  description="See which markers drive your results and what to do next (nutrition + lifestyle)."
                />
                <FeatureCard
                  icon={<LineChart className="w-5 h-5" style={{ color: 'var(--accent-warm)' }} />}
                  title="Trends over time (signed-in)"
                  description="Save analyses and track your score and markers across time with forecasts."
                />
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold select-none" style={{ color: 'var(--text-primary)' }}>
                How it works
              </h2>
              <p className="text-sm mt-1 select-none" style={{ color: 'var(--text-secondary)' }}>
                Fast, private, and designed for action.
              </p>
            </div>
            <Link
              href="/analyze"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              Start free analysis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <StepCard
              num={1}
              title="Enter your profile"
              description="Age, height, weight, activity, and goal to compute calories + macros."
            />
            <StepCard
              num={2}
              title="Upload labs (optional)"
              description="Upload a report for extraction or enter markers manually."
            />
            <StepCard
              num={3}
              title="Get your results"
              description="Health score, key drivers, recommendations, and (when eligible) cardiovascular risk."
            />
          </div>
        </section>

        {/* Trust */}
        <section className="mt-14">
          <div
            className="rounded-3xl p-6 sm:p-8 noise select-none"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
              >
                <Shield className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Privacy + transparency
                </h3>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Your progress is saved locally by default. If you sign in, you can optionally save results to your account to track trends.
                  BetterCals provides estimates for informational purposes only and is not medical advice.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 select-none" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <VitalsMark sizePx={30} />
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>BetterCals</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Smart calorie & lab insights</div>
            </div>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            BetterCals provides estimates for informational purposes only. Always consult healthcare professionals for medical advice.
          </div>
        </div>
      </footer>

      <DemoModal open={demoOpen} onCloseAction={() => setDemoOpen(false)} />
    </div>
  );
}
