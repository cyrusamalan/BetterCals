import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Target,
  Activity,
  Scale,
  Droplet,
  Flame,
  TrendingUp,
} from 'lucide-react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';
const base = siteUrl.replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'About',
  description:
    'Beyond Calories: BetterCals bridges nutrition tracking and preventative medicine using metabolic markers and risk modeling.',
  alternates: { canonical: `${base}/about` },
};

const GLASS_CARD: React.CSSProperties = {
  background: 'var(--card-bg)',
  backdropFilter: 'blur(24px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
};

const MARKERS: { icon: React.ComponentType<{ className?: string }>; name: string; blurb: string }[] = [
  {
    icon: Activity,
    name: 'ApoB',
    blurb: 'The particle count driving atherosclerosis — a sharper cardiovascular signal than LDL alone.',
  },
  {
    icon: Scale,
    name: 'TG / HDL Ratio',
    blurb: 'A quick read on insulin sensitivity and atherogenic dyslipidemia.',
  },
  {
    icon: Droplet,
    name: 'Fasting Insulin',
    blurb: 'Catches metabolic dysfunction years before fasting glucose starts to shift.',
  },
  {
    icon: Flame,
    name: 'hs-CRP',
    blurb: 'Low-grade inflammation tracker; elevated values compound cardiovascular risk.',
  },
  {
    icon: TrendingUp,
    name: 'HbA1c',
    blurb: 'Three-month average blood sugar — the long view on glycemic control.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--page-gradient-simple)' }}>
      <header
        className="sticky top-0 z-30"
        style={{
          backgroundColor: 'var(--header-bg)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          borderBottom: '1px solid var(--header-border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-press transition-colors"
            style={{
              background: 'var(--border-light)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: 'var(--text-inverse)',
              boxShadow: '0 2px 6px rgba(107, 143, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            Start free analysis
            <ArrowRight className="hidden sm:inline-block w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-10 pb-16">
        {/* Hero */}
        <section className="rounded-3xl p-7 sm:p-12 anim-fade-up" style={GLASS_CARD}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              color: 'var(--accent)',
              border: '1px solid rgba(107, 143, 113, 0.22)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Our mission
          </div>

          <h1
            className="font-display text-4xl sm:text-6xl leading-[1.03] mt-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Beyond calories.
          </h1>

          <p
            className="text-base sm:text-lg mt-5 max-w-2xl leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            BetterCals bridges the gap between nutrition tracking and preventative medicine — so daily food
            decisions can be guided by metabolic context, not calorie totals alone.
          </p>
        </section>

        {/* Problem / Solution */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="rounded-2xl p-6 sm:p-7" style={GLASS_CARD}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: 'var(--status-warning-bg)',
                border: '1px solid var(--status-warning-border)',
                color: 'var(--status-warning)',
              }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              The problem
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Most nutrition apps treat all calories as equal and stop there. They rarely account for metabolic
              health signals, lipid quality, inflammation patterns, or insulin dynamics that shape real
              performance and long-term risk.
            </p>
          </div>

          <div className="rounded-2xl p-6 sm:p-7" style={GLASS_CARD}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: 'var(--accent-subtle)',
                border: '1px solid rgba(107, 143, 113, 0.22)',
                color: 'var(--accent)',
              }}
            >
              <Target className="w-4 h-4" />
            </div>
            <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              The BetterCals approach
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We bring bloodwork into the feedback loop — markers like ApoB and the TG/HDL ratio — so calorie
              and macro recommendations reflect your metabolic profile, not just a body-weight target.
            </p>
          </div>
        </section>

        {/* Founder's story */}
        <section className="rounded-2xl p-6 sm:p-8 mt-6 relative overflow-hidden" style={GLASS_CARD}>
          <div
            aria-hidden
            className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full"
            style={{ background: 'var(--accent)' }}
          />
          <div className="pl-5 sm:pl-6">
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: 'var(--accent)' }}
            >
              Founder&apos;s story
            </p>
            <p
              className="mt-3 text-base sm:text-lg leading-relaxed max-w-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              As a data-science graduate student and an athlete training with fitness wearables, I wanted a
              better system than generic calorie targets. BetterCals is the vision I kept sketching on
              napkins: a high-performance engine for metabolic optimization that combines nutrition
              behaviors, clinical markers, and risk modeling in one clear workflow.
            </p>
          </div>
        </section>

        {/* What we measure */}
        <section className="mt-8">
          <div className="mb-5 text-center sm:text-left">
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: 'var(--accent)' }}
            >
              What we measure
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl leading-tight mt-1"
              style={{ color: 'var(--text-primary)' }}
            >
              The markers behind every recommendation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MARKERS.map(({ icon: Icon, name, blurb }) => (
              <div key={name} className="rounded-2xl p-5" style={GLASS_CARD}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: 'var(--accent-subtle)',
                    border: '1px solid rgba(107, 143, 113, 0.22)',
                    color: 'var(--accent)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {name}
                </h3>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {blurb}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="rounded-2xl p-6 sm:p-8 mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={GLASS_CARD}
        >
          <div>
            <h2 className="font-display text-2xl leading-tight" style={{ color: 'var(--text-primary)' }}>
              Ready to see your numbers?
            </h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              Free to try. No credit card. Your data stays yours.
            </p>
          </div>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold btn-press self-start sm:self-auto"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: 'var(--text-inverse)',
              boxShadow: '0 10px 22px rgba(107, 143, 113, 0.22), inset 0 1px 0 rgba(255,255,255,0.16)',
            }}
          >
            Start free analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
