'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BetterCalsMark from '@/components/BetterCalsMark';

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setLoading(true);
    setError('');

    try {
      await signUp.create({
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
        router.push('/');
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
        redirectUrlComplete: '/',
      });
    } catch {
      setError('Could not start Google sign up. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-[20px] flex items-center justify-center mb-3"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d2d2cc',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <BetterCalsMark className="w-9 h-9" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
            {pendingVerification ? 'Check your email' : 'Create your account'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {pendingVerification
              ? `We sent a code to ${email}`
              : 'Track your health with BetterCals'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)',
          }}
        >
          {pendingVerification ? (
            /* Verification step */
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Verification code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-center tracking-[0.3em] font-mono"
                  style={{
                    backgroundColor: 'var(--bg-warm)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  placeholder="123456"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: 'var(--status-danger)', backgroundColor: 'var(--status-danger-bg)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--text-inverse)',
                  boxShadow: '0 2px 6px rgba(107, 143, 113, 0.25)',
                }}
              >
                {loading ? 'Verifying...' : 'Verify email'}
              </button>
            </form>
          ) : (
            <>
              {/* Google sign up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium btn-press"
                style={{
                  backgroundColor: 'var(--bg-warm)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              </div>

              {/* Email/password form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: 'var(--bg-warm)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: 'var(--bg-warm)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    placeholder="At least 8 characters"
                  />
                </div>

                {error && (
                  <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: 'var(--status-danger)', backgroundColor: 'var(--status-danger-bg)' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text-inverse)',
                    boxShadow: '0 2px 6px rgba(107, 143, 113, 0.25)',
                  }}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-tertiary)' }}>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-semibold" style={{ color: 'var(--accent)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
