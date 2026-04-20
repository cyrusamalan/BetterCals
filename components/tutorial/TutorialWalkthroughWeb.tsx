'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, Lock, Share2 } from 'lucide-react';
import { easeOut } from './constants';
import { TutorialBackground, tutorialPageBgStyle } from './TutorialBackground';
import { TutorialDemoScene } from './TutorialDemoScene';
import { useClipboardShare } from './useClipboardShare';

function BrowserChrome() {
  return (
    <div
      className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b"
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-1.5 flex-shrink-0" aria-hidden>
        <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
        <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
        <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
      </div>
      <div
        className="flex-1 flex items-center gap-2 min-w-0 rounded-lg px-3 py-2 text-left"
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.95)' }} aria-hidden />
        <span className="text-[11px] sm:text-xs truncate font-mono" style={{ color: 'rgba(203,213,225,0.95)' }}>
          bettercals.com/analyze
        </span>
      </div>
    </div>
  );
}

export function TutorialWalkthroughWeb() {
  const { copied, handleShare } = useClipboardShare('/tutorial_web');

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ ...tutorialPageBgStyle(), cursor: 'none' }}
    >
      <TutorialBackground />

      <header className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-12 pb-6 max-w-2xl mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(125,200,138,0.12)', border: '1px solid rgba(125,200,138,0.25)' }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color: '#9fd9ae' }} aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#c8f5d2' }}>
              BetterCals
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-normal tracking-tight" style={{ color: '#f8fafc' }}>
            From labs to clarity
          </h1>
          <p className="mt-2 text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(148,163,184,0.98)' }}>
            Desktop walkthrough — wide layout, browser frame, and a full dashboard preview.
          </p>
        </motion.div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 pb-10 w-full max-w-5xl mx-auto">
        <div
          className="rounded-xl overflow-hidden w-full"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <BrowserChrome />
          <div className="p-5 sm:p-8 lg:p-10" style={{ background: '#0a0d12' }}>
            <TutorialDemoScene layout="web" />
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-center sm:items-center max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors min-h-[48px] cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
            }}
          >
            <Share2 className="w-4 h-4" aria-hidden />
            {copied ? 'Link copied' : 'Share'}
          </button>
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold min-h-[48px] transition-transform active:scale-[0.98] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #5a8f65 0%, #7dc88a 100%)',
              color: '#0b120e',
              boxShadow: '0 14px 40px rgba(90, 143, 101, 0.35)',
            }}
          >
            Try it now
          </Link>
        </div>
      </section>
    </div>
  );
}
