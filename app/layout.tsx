import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';

export const metadata: Metadata = {
  title: {
    default: 'BetterCals - Smart Calorie & Health Calculator',
    template: '%s | BetterCals',
  },
  description: 'Calculate your maintenance calories and get personalized health insights from your blood reports.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    siteName: 'BetterCals',
    title: 'BetterCals - Smart Calorie & Health Calculator',
    description: 'Calculate your maintenance calories and get personalized health insights from your blood reports.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BetterCals - Smart Calorie & Health Calculator',
    description: 'Calculate your maintenance calories and get personalized health insights from your blood reports.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSerif.variable} ${dmSans.variable}`} suppressHydrationWarning>
        <body className="min-h-screen font-body">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:text-sm focus:font-semibold"
          >
            Skip to main content
          </a>
          <main id="main-content">
            {children}
          </main>
          <Analytics />
          <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer" />
        </body>
      </html>
    </ClerkProvider>
  );
}
