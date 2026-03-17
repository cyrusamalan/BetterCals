import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BloodWise - Smart Calorie & Health Calculator',
  description: 'Calculate your maintenance calories and get personalized health insights from your blood reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
