'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useSignUp } from '@clerk/nextjs/legacy';
import Link from 'next/link';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function UsernameOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { signUp, isLoaded: signUpLoaded, setActive } = useSignUp();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const usernameIsValid = useMemo(() => USERNAME_PATTERN.test(username.trim().toLowerCase()), [username]);
  const hasPendingSignUp = Boolean(signUpLoaded && signUp && signUp.status && signUp.status !== 'complete');

  useEffect(() => {
    if (!userLoaded || !signUpLoaded) return;
    if (isSignedIn && user?.username) {
      router.replace('/analyze');
      return;
    }
    if (!isSignedIn && !hasPendingSignUp) {
      router.replace('/sign-in');
    }
  }, [userLoaded, signUpLoaded, isSignedIn, user?.username, hasPendingSignUp, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError('Username must be 3-20 characters and only use lowercase letters, numbers, or underscores.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (hasPendingSignUp && signUp && setActive) {
        const result = await signUp.update({ username: normalizedUsername });
        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.push('/analyze');
        } else {
          setError('Sign up could not be completed. Please try again.');
        }
      } else if (user) {
        await user.update({ username: normalizedUsername });
        router.push('/analyze');
      } else {
        setError('No active sign up found. Please start over.');
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { longMessage?: string }[] };
      setError(clerkError.errors?.[0]?.longMessage || 'Could not save username. Please try another one.');
    } finally {
      setSaving(false);
    }
  };

  if (!userLoaded || !signUpLoaded) {
    return null;
  }

  if (!isSignedIn && !hasPendingSignUp) {
    return null;
  }

  return (
    <div className="auth-single-page">
      <header className="auth-topbar">
        <div className="auth-topbar-left">
          <span className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            BetterCals
          </span>
        </div>
        <div className="auth-topbar-center" />
        <div className="auth-topbar-right" />
      </header>

      <div className="auth-single-main">
        <div className="w-full max-w-[400px] mx-auto">
          <div className="mb-7">
            <h1
              className="auth-text-enter font-display text-[1.75rem] leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Choose your username
            </h1>
            <p
              className="auth-text-enter text-sm mt-1.5"
              style={{ color: 'var(--text-secondary)', animationDelay: '0.15s' }}
            >
              This is how your BetterCals profile appears in your account.
            </p>
          </div>

          <div className="auth-card p-7 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 transition-colors duration-200"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="auth-input"
                  placeholder="health_hustler"
                  autoComplete="username"
                  autoFocus
                />
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  3-20 chars, lowercase letters, numbers, underscores.
                </p>
              </div>

              {error && (
                <div
                  className="text-xs font-medium px-3.5 py-2.5 rounded-xl anim-scale-in"
                  style={{
                    color: 'var(--status-danger)',
                    backgroundColor: 'var(--status-danger-bg)',
                    border: '1px solid var(--status-danger-border)',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !usernameIsValid}
                className="auth-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving username...' : 'Continue'}
              </button>
            </form>
          </div>

          <p
            className="auth-single-footer auth-text-enter text-center text-sm"
            style={{ color: 'var(--text-secondary)', animationDelay: '0.4s' }}
          >
            Already finished this step?{' '}
            <Link
              href="/analyze"
              className="font-semibold transition-colors duration-200 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
