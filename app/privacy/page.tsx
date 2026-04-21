import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import VitalsMark from '@/components/VitalsMark';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How BetterCals handles your data: local storage by default, optional cloud sync with an account, and use of health data for scores and trends.',
  alternates: { canonical: `${siteUrl.replace(/\/$/, '')}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className="sticky top-0 z-30"
        style={{
          backgroundColor: 'var(--header-bg)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          borderBottom: '1px solid var(--header-border)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-3 sm:py-3.5">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 w-fit">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <VitalsMark sizePx={32} />
            </div>
            <div className="text-[18px] sm:text-[20px] font-bold font-display" style={{ color: 'var(--text-primary)' }}>
              BetterCals
            </div>
          </Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium mb-10 transition-opacity hover:opacity-80"
          style={{ color: 'var(--accent-hover)' }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to home
        </Link>
        <PrivacyPolicy />
      </div>
    </div>
  );
}
