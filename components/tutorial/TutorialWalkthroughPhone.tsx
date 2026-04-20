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
      className="flex items-center justify-between px-4 pt-2 pb-1.5 text-[10px] font-medium tabular-nums flex-shrink-0"
      style={{ color: 'rgba(248,250,252,0.92)' }}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1" aria-hidden>
        <Signal className="w-3 h-3" style={{ color: 'rgba(248,250,252,0.85)' }} />
        <Wifi className="w-3 h-3" style={{ color: 'rgba(248,250,252,0.85)' }} />
        <Battery className="w-3.5 h-3.5" style={{ color: 'rgba(248,250,252,0.85)' }} />
      </div>
    </div>
  );
}

function PhoneHomeIndicator() {
  return (
    <div className="flex justify-center pb-1.5 pt-0.5 flex-shrink-0">
      <div
        className="h-1 w-[100px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      />
    </div>
  );
}

export function TutorialWalkthroughPhone() {
  const { copied, handleShare } = useClipboardShare('/tutorial_phone');

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ ...tutorialPageBgStyle(), cursor: 'none' }}
    >
      <TutorialBackground />

      <header className="relative z-10 px-4 pt-5 pb-3 max-w-lg mx-auto w-full text-center flex-shrink-0">
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
          <h1 className="text-lg sm:text-xl font-display font-normal tracking-tight" style={{ color: '#f8fafc' }}>
            From labs to clarity
          </h1>
          <p className="mt-1 text-[11px] sm:text-xs max-w-sm mx-auto leading-snug" style={{ color: 'rgba(148,163,184,0.98)' }}>
            Mobile walkthrough — your data, animated like the real app.
          </p>
        </motion.div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center px-4 pb-4 w-full max-w-[420px] mx-auto min-h-0">
        <div
          className="w-full max-w-[340px] rounded-[2rem] p-[8px] flex-1 flex flex-col min-h-0"
          style={{
            background: 'linear-gradient(160deg, #353b48 0%, #1a1e26 100%)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
            maxHeight: 'calc(100vh - 200px)',
          }}
        >
          <div
            className="rounded-[1.6rem] overflow-hidden flex flex-col flex-1 min-h-0"
            style={{ background: '#0a0d12' }}
          >
            <PhoneStatusBar />
            <div className="flex-1 overflow-hidden px-2.5 pt-1 pb-2 flex flex-col min-h-0">
              <TutorialDemoScene layout="phone" />
            </div>
            <PhoneHomeIndicator />
          </div>
        </div>

        <div className="mt-3 flex flex-row gap-2.5 justify-center items-center flex-shrink-0 w-full max-w-md">
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
