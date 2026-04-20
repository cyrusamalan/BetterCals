import type { Metadata } from 'next';
import { TutorialWalkthroughPhone } from '@/components/tutorial/TutorialWalkthroughPhone';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bettercals.com';
const base = siteUrl.replace(/\/$/, '');
const shareTitle = 'See how BetterCals transforms your health data.';
const shareDescription =
  'Mobile walkthrough: profile, lab upload, then your score and TDEE. Share this link or open the full analyzer.';

export const metadata: Metadata = {
  title: {
    absolute: shareTitle,
  },
  description: shareDescription,
  alternates: { canonical: `${base}/tutorial_phone` },
  openGraph: {
    type: 'website',
    siteName: 'BetterCals',
    url: `${base}/tutorial_phone`,
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

export default function TutorialPhonePage() {
  return <TutorialWalkthroughPhone />;
}
