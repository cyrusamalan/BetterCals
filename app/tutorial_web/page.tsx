import type { Metadata } from 'next';
import { TutorialWalkthroughWeb } from '@/components/tutorial/TutorialWalkthroughWeb';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';
const base = siteUrl.replace(/\/$/, '');
const shareTitle = 'See how BetterCals transforms your health data.';
const shareDescription =
  'Desktop walkthrough in a browser frame: profile, labs, and a full dashboard preview. Share or try the analyzer.';

export const metadata: Metadata = {
  title: {
    absolute: shareTitle,
  },
  description: shareDescription,
  alternates: { canonical: `${base}/tutorial_web` },
  openGraph: {
    type: 'website',
    siteName: 'BetterCals',
    url: `${base}/tutorial_web`,
    title: shareTitle,
    description: shareDescription,
    images: [
      {
        url: '/blood-logo.png',
        width: 512,
        height: 512,
        alt: 'BetterCals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: shareDescription,
    images: ['/blood-logo.png'],
  },
};

export default function TutorialWebPage() {
  return <TutorialWalkthroughWeb />;
}
