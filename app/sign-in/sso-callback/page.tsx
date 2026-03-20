'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  return (
    <div className="auth-bg min-h-screen flex items-center justify-center">
      <div className="auth-orb-3" />
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div
          className="w-10 h-10 rounded-full border-2 auth-logo-enter"
          style={{
            borderColor: 'var(--border-light)',
            borderTopColor: 'var(--accent)',
            animation: 'authLogoEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both, spin 1s linear 0.5s infinite',
          }}
        />
        <p
          className="auth-text-enter text-sm font-medium"
          style={{ color: 'var(--text-tertiary)', animationDelay: '0.3s' }}
        >
          Completing sign in...
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
