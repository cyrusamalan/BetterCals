import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coach History',
  description: 'Review prior coach conversations grouped into turns by day.',
};

export default function CoachHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
