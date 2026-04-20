import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TermsOfService } from '@/components/TermsOfService';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms governing use of BetterCals, including limitations of liability for health forecasts and informational use only.',
  alternates: { canonical: `${siteUrl.replace(/\/$/, '')}/terms` },
};

export default function TermsPage() {
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
        <TermsOfService />
      </div>
    </div>
  );
}
