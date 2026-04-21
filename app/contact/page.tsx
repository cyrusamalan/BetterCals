import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import VitalsMark from '@/components/VitalsMark';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';
const base = siteUrl.replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with BetterCals for support, product feedback, or general questions.',
  alternates: { canonical: `${base}/contact` },
};

export default function ContactPage() {
  const contactEmail = 'support@bettercal.com';
  const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactEmail)}&su=${encodeURIComponent('BetterCals Support')}`;

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

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-display text-3xl sm:text-4xl leading-tight" style={{ color: 'var(--text-primary)' }}>
            Contact
          </h1>
          <p className="text-base mt-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Need help, found a bug, or want to suggest a feature? Reach out and we will review it as soon as possible.
          </p>

          <p className="text-sm mt-5" style={{ color: 'var(--text-primary)' }}>
            Email: <span className="font-semibold">{contactEmail}</span>
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={composeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold btn-press"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                color: 'var(--text-inverse)',
              }}
            >
              Send an email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
