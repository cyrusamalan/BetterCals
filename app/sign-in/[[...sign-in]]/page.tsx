'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BetterCalsMark from '@/components/BetterCalsMark';

/* ── Animated donut hero for the branding panel ── */
function DonutHero() {
  const thicknessPx = 42;

  // Conic-gradient ring with a right-side gap to form a "C".
  const gradient = `conic-gradient(from 90deg,
    /* Right-facing "C" gap wedge is split into quarter red/yellow. */
    #a05a5a 0deg 45deg,
    #22c55e 45deg 315deg,
    #b8960b 315deg 360deg
  )`;

  const ringMask = `radial-gradient(farthest-side, transparent calc(100% - ${thicknessPx}px), #000 calc(100% - ${thicknessPx - 1}px))`;

  return (
    <div className="auth-donut-hero">
      <div
        className="auth-donut-ring-animate auth-donut-spin w-[280px] h-[280px] md:w-[320px] md:h-[320px] relative rounded-full"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: gradient,
            WebkitMaskImage: ringMask,
            maskImage: ringMask,
          }}
        />

        {/* Center content: subtle logo watermark + professional ECG waveform (no text). */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[180px] h-[120px]">
            <svg viewBox="0 0 140 80" className="absolute inset-0 w-full h-full" aria-hidden="true">
              <path
                d="M8 44
                   L30 44
                   L36 44
                   L42 38
                   L48 44
                   L54 44
                   L60 44
                   L62 36
                   L66 44
                   L70 44
                   L74 18
                   L78 44
                   L86 68
                   L90 44
                   L106 44
                   L110 36
                   L116 44
                   L122 44
                   L130 44"
                fill="none"
                stroke="#ff2d2d"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId });
        router.push('/');
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { longMessage?: string }[] };
      setError(clerkError.errors?.[0]?.longMessage || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sign-in/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch {
      setError('Could not start Google sign in. Please try again.');
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* ── LEFT PANEL — Branding ── */}
      <div className="auth-split-brand">
        <div className="auth-split-brand-inner">
          {/* Top logo */}
          <div className="flex items-center gap-2.5 mb-auto">
            <BetterCalsMark className="w-11 h-11" />
            <span className="text-white/90 text-lg font-bold tracking-tight">BetterCals</span>
          </div>

          {/* Donut hero */}
          <DonutHero />

          {/* Tagline */}
          <div className="mt-auto">
            <h2 className="text-white text-[1.4rem] md:text-2xl font-bold leading-snug">
              Track smarter.<br />
              <span className="text-white/60">Live healthier.</span>
            </h2>
            <p className="text-white/40 text-sm mt-2 max-w-[260px]">
              Upload blood reports, get personalized calorie targets and deep health insights.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="auth-split-form">
        <div className="w-full max-w-[400px] mx-auto">
          {/* Mobile logo (hidden on desktop) */}
          <div className="flex flex-col items-center mb-7 md:hidden">
            <BetterCalsMark className="auth-logo-enter w-16 h-16 mb-3" />
          </div>

          {/* Header */}
          <div className="mb-7">
            <h1
              className="auth-text-enter font-display text-[1.75rem] leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back
            </h1>
            <p
              className="auth-text-enter text-sm mt-1.5"
              style={{ color: 'var(--text-tertiary)', animationDelay: '0.15s' }}
            >
              Sign in to your BetterCals account
            </p>
          </div>

          {/* Card */}
          <div className="auth-card p-7 space-y-5">
            {/* Google sign in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="auth-btn-social"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 transition-colors duration-200"
                  style={{ color: focusedField === 'email' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 transition-colors duration-200"
                  style={{ color: focusedField === 'password' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="auth-input"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div
                  className="text-xs font-medium px-3.5 py-2.5 rounded-xl anim-scale-in flex items-center gap-2"
                  style={{
                    color: 'var(--status-danger)',
                    backgroundColor: 'var(--status-danger-bg)',
                    border: '1px solid var(--status-danger-border)',
                  }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="auth-btn-primary"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p
            className="auth-text-enter text-center text-sm mt-6"
            style={{ color: 'var(--text-tertiary)', animationDelay: '0.4s' }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/sign-up"
              className="font-semibold transition-colors duration-200 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
