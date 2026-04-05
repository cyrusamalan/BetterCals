import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analyze',
  description: 'Enter your profile and blood markers to get personalized calorie, macro, and health insights.',
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
