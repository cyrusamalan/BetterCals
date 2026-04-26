'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandHeaderMark from '@/components/BrandHeaderMark';

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  const usernamePattern = /^[a-z0-9_]{3,20}$/;
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    const normalizedUsername = username.trim().toLowerCase();
    if (!usernamePattern.test(normalizedUsername)) {
      setError('Username must be 3-20 characters and only use lowercase letters, numbers, or underscores.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp.create({
        username: normalizedUsername,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: { longMessage?: string }[] };
      setError(clerkError.errors?.[0]?.longMessage || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding/username');
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { longMessage?: string }[] };
      setError(clerkError.errors?.[0]?.longMessage || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sign-up/sso-callback',
        redirectUrlComplete: '/onboarding/username',
      });
    } catch {
      setError('Could not start Google sign up. Please try again.');
    }
  };

  return (
    <div className="auth-single-page">
      <header className="auth-topbar">
        <div className="auth-topbar-left">
          <BrandHeaderMark href="/" sizePx={40} />
        </div>

        <div className="auth-topbar-center" />
        <div className="auth-topbar-right" />
      </header>

      <div className="auth-single-main">
        <div className="w-full max-w-[400px] mx-auto">
          {/* Header */}
          <div className="mb-7">
            <h1
              className="auth-text-enter font-display text-[1.75rem] leading-tight"
              style={{
                color: 'var(--text-primary)',
              }}
            >
              {pendingVerification ? 'Check your email' : 'Create your account'}
            </h1>
            <p
              className="auth-text-enter text-sm mt-1.5"
              style={{
                color: 'var(--text-secondary)',
                animationDelay: '0.15s',
              }}
            >
              {pendingVerification
                ? `We sent a 6-digit code to ${email}`
                : 'Start tracking your health with BetterCals'}
            </p>
          </div>

          {/* Card */}
          <div className="auth-card p-7 space-y-5">
            {pendingVerification ? (
              /* ── Verification step ── */
              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label
                    className="block text-xs font-semibold mb-2 transition-colors duration-200"
                    style={{ color: focusedField === 'code' ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocusedField('code')}
                    onBlur={() => setFocusedField(null)}
                    className="auth-input text-center tracking-[0.3em] font-mono"
                    placeholder="123456"
                    autoFocus
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
                      Verifying...
                    </span>
                  ) : (
                    'Verify email'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setPendingVerification(false); setError(''); setCode(''); }}
                  className="w-full text-center text-xs font-medium transition-colors duration-200"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  Use a different email
                </button>
              </form>
            ) : (
              <>
                {/* Google sign up */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
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
                      style={{ color: focusedField === 'username' ? 'var(--accent)' : 'var(--text-secondary)' }}
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      className="auth-input"
                      placeholder="health_hustler"
                      autoComplete="username"
                    />
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      3-20 chars, lowercase letters, numbers, underscores.
                    </p>
                  </div>

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
                      placeholder="At least 8 characters"
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
                        Creating account...
                      </span>
                    ) : (
                      'Create account'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Bottom text (moved from left panel) */}
          <div className="auth-single-tagline">
            <h2 className="text-[1.4rem] md:text-2xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
              Know your numbers.<br />
              <span style={{ color: 'var(--text-tertiary)' }}>Own your health.</span>
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Personalized calorie targets and deep health insights from your blood work.
            </p>
          </div>

          {/* Footer link */}
          <p
            className="auth-single-footer auth-text-enter text-center text-sm"
            style={{ color: 'var(--text-secondary)', animationDelay: '0.4s' }}
          >
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="font-semibold transition-colors duration-200 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
