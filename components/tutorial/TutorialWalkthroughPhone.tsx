'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, Battery, Share2, Signal, Wifi } from 'lucide-react';
import { easeOut } from './constants';
import { TutorialBackground, tutorialPageBgStyle } from './TutorialBackground';
import { TutorialDemoScene } from './TutorialDemoScene';
import { useClipboardShare } from './useClipboardShare';

function PhoneStatusBar() {
  return (
    <div
      className="flex items-center justify-between px-4 pt-3 pb-2 text-[11px] font-medium tabular-nums"
      style={{ color: 'rgba(248,250,252,0.92)' }}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1.5" aria-hidden>
        <Signal className="w-3.5 h-3.5" style={{ color: 'rgba(248,250,252,0.85)' }} />
        <Wifi className="w-3.5 h-3.5" style={{ color: 'rgba(248,250,252,0.85)' }} />
        <Battery className="w-4 h-4" style={{ color: 'rgba(248,250,252,0.85)' }} />
      </div>
    </div>
  );
}

function PhoneHomeIndicator() {
  return (
    <div className="flex justify-center pb-2 pt-1">
      <div
        className="h-1 w-[120px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      />
    </div>
  );
}

export function TutorialWalkthroughPhone() {
  const { copied, handleShare } = useClipboardShare('/tutorial_phone');

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ ...tutorialPageBgStyle(), cursor: 'none' }}
    >
      <TutorialBackground />

      <header className="relative z-10 px-4 pt-8 pb-5 max-w-lg mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
            style={{ background: 'rgba(125,200,138,0.12)', border: '1px solid rgba(125,200,138,0.25)' }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color: '#9fd9ae' }} aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#c8f5d2' }}>
              BetterCals
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-normal tracking-tight" style={{ color: '#f8fafc' }}>
            From labs to clarity
          </h1>
          <p className="mt-2 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'rgba(148,163,184,0.98)' }}>
            Mobile walkthrough — your data, animated like the real app.
          </p>
        </motion.div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center px-4 pb-8 w-full max-w-[420px] mx-auto">
        <div
          className="w-full max-w-[380px] rounded-[2.35rem] p-[10px]"
          style={{
            background: 'linear-gradient(160deg, #353b48 0%, #1a1e26 100%)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="rounded-[1.9rem] overflow-hidden flex flex-col min-h-[520px] max-h-[min(72vh,640px)]"
            style={{ background: '#0a0d12' }}
          >
            <PhoneStatusBar />
            <div className="flex-1 overflow-y-auto px-3 pt-1 pb-3 flex flex-col min-h-0">
              <TutorialDemoScene layout="phone" />
            </div>
            <PhoneHomeIndicator />
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-center w-full max-w-md">
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
