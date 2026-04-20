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
      className="flex items-center gap-3 px-3 sm:px-4 py-2 border-b flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-1.5 flex-shrink-0" aria-hidden>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
      </div>
      <div
        className="flex-1 flex items-center gap-2 min-w-0 rounded-lg px-3 py-1.5 text-left"
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.95)' }} aria-hidden />
        <span className="text-[10px] sm:text-[11px] truncate font-mono" style={{ color: 'rgba(203,213,225,0.95)' }}>
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
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ ...tutorialPageBgStyle(), cursor: 'none' }}
    >
      <TutorialBackground />

      <header className="relative z-10 px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 max-w-2xl mx-auto w-full text-center flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full mb-2"
            style={{ background: 'rgba(125,200,138,0.12)', border: '1px solid rgba(125,200,138,0.25)' }}
          >
            <Activity className="w-3 h-3" style={{ color: '#9fd9ae' }} aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#c8f5d2' }}>
              BetterCals
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-normal tracking-tight" style={{ color: '#f8fafc' }}>
            From labs to clarity
          </h1>
          <p className="mt-1 text-xs sm:text-sm max-w-lg mx-auto leading-snug" style={{ color: 'rgba(148,163,184,0.98)' }}>
            Desktop walkthrough — wide layout, browser frame, and a full dashboard preview.
          </p>
        </motion.div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 pb-4 w-full max-w-5xl mx-auto min-h-0">
        <div
          className="rounded-xl overflow-hidden w-full flex-1 flex flex-col min-h-0"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <BrowserChrome />
          <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-5 lg:p-6" style={{ background: '#0a0d12' }}>
            <TutorialDemoScene layout="web" />
          </div>
        </div>

        <div className="mt-3 flex flex-row gap-2.5 justify-center items-center flex-shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors min-h-[40px] cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
            }}
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden />
            {copied ? 'Link copied' : 'Share'}
          </button>
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-semibold min-h-[40px] transition-transform active:scale-[0.98] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #5a8f65 0%, #7dc88a 100%)',
              color: '#0b120e',
              boxShadow: '0 10px 30px rgba(90, 143, 101, 0.35)',
            }}
          >
            Try it now
          </Link>
        </div>
      </section>
    </div>
  );
}
