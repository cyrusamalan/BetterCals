import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';

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
