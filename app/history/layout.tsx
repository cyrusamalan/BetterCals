import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'History & Trends',
  description: 'Track your health analysis history, compare results, and view marker trend forecasts.',
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
