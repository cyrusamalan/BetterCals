'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { User, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import BrandHeaderMark from '@/components/BrandHeaderMark';

const NAV_ITEMS = [
  { href: '/settings/account', label: 'Account', icon: User },
  { href: '/settings/preferences', label: 'Preferences', icon: SlidersHorizontal },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="auth-single-page">
      <header className="auth-topbar">
        <div className="auth-topbar-left">
          <BrandHeaderMark href="/" sizePx={40} />
        </div>
        <div className="auth-topbar-center" />
        <div className="auth-topbar-right">
          <Link
            href="/analyze"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-press transition-colors"
            style={{
              background: 'var(--border-light)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Analyze
          </Link>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-6 pt-10 pb-16">
        <div className="mb-8 text-left">
          <h1 className="font-display text-[2rem] leading-tight" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage your account and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
          <nav className="flex md:flex-col gap-1 md:sticky md:top-24 md:self-start">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold btn-press transition-colors"
                  style={{
                    background: active ? 'var(--accent-subtle)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    border: active ? '1px solid rgba(107, 143, 113, 0.2)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="text-left">{children}</div>
        </div>
      </main>
    </div>
  );
}
