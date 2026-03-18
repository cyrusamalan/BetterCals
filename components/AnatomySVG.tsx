'use client';

import { useState } from 'react';

interface AnatomySVGProps {
  highlightSystem?: 'cardiovascular' | 'metabolic' | 'hormonal' | 'nutritional' | null;
}

const ORGAN_LABELS: Record<string, string> = {
  brain: 'Brain',
  thyroid: 'Thyroid',
  lungs: 'Lungs',
  heart: 'Heart',
  liver: 'Liver',
  stomach: 'Stomach',
  pancreas: 'Pancreas',
  kidneys: 'Kidneys',
  intestines: 'Intestines',
};

export default function AnatomySVG({ highlightSystem }: AnatomySVGProps) {
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  const isSystemActive = (systems: string[]) => {
    if (highlightSystem && systems.includes(highlightSystem)) return true;
    return false;
  };

  const organOpacity = (organ: string, base: number) => {
    if (hoveredOrgan === organ) return Math.min(1, base + 0.35);
    return base;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a1d23 0%, #12141a 40%, #0d0f14 100%)' }}>
      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />

      <svg
        viewBox="0 0 340 620"
        className="w-full h-auto relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Body skin gradient */}
          <linearGradient id="skinBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3a2e2e" />
            <stop offset="100%" stopColor="#2d2424" />
          </linearGradient>
          <linearGradient id="skinHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a3c3c" />
            <stop offset="100%" stopColor="#352a2a" />
          </linearGradient>

          {/* Organ gradients */}
          <radialGradient id="heartGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#e8453c" />
            <stop offset="70%" stopColor="#c62828" />
            <stop offset="100%" stopColor="#8e1c1c" />
          </radialGradient>
          <radialGradient id="lungGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#7a9cb8" />
            <stop offset="100%" stopColor="#4a6e88" />
          </radialGradient>
          <radialGradient id="liverGrad" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#a85a40" />
            <stop offset="100%" stopColor="#6e3828" />
          </radialGradient>
          <radialGradient id="stomachGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#c49070" />
            <stop offset="100%" stopColor="#8a6040" />
          </radialGradient>
          <radialGradient id="kidneyGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#9c5858" />
            <stop offset="100%" stopColor="#6b3838" />
          </radialGradient>
          <radialGradient id="pancreasGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#d4a856" />
            <stop offset="100%" stopColor="#9a7830" />
          </radialGradient>
          <radialGradient id="intestineGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#c08080" />
            <stop offset="100%" stopColor="#7a4a4a" />
          </radialGradient>
          <radialGradient id="brainGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#d4a0a0" />
            <stop offset="60%" stopColor="#b07878" />
            <stop offset="100%" stopColor="#805050" />
          </radialGradient>
          <radialGradient id="thyroidGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#6a9ab8" />
            <stop offset="100%" stopColor="#3a6a88" />
          </radialGradient>

          {/* Arterial blood gradient */}
          <linearGradient id="arterialFlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef5350" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c62828" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="venousFlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5c6bc0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3949ab" stopOpacity="0.5" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="organGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor="#ef5350" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor="#5c6bc0" floodOpacity="0.25" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ═══════════════════════════════════════ */}
        {/* BODY SILHOUETTE — anatomically contoured */}
        {/* ═══════════════════════════════════════ */}
        <g opacity="0.85">
          {/* Head */}
          <path d="M 170 18 C 148 18, 130 32, 128 56 C 126 72, 132 84, 140 92 L 138 100 L 202 100 L 200 92 C 208 84, 214 72, 212 56 C 210 32, 192 18, 170 18 Z"
            fill="url(#skinHighlight)" stroke="#4a3838" strokeWidth="0.8" />

          {/* Neck */}
          <path d="M 152 100 L 148 128 L 192 128 L 188 100 Z"
            fill="url(#skinBase)" stroke="#4a3838" strokeWidth="0.6" />

          {/* Torso — shoulders to hips, anatomical curve */}
          <path d="
            M 148 128
            C 130 128, 98 130, 82 142
            Q 72 150, 70 165
            L 72 180
            Q 74 190, 80 195
            L 85 200
            Q 92 280, 100 310
            Q 105 330, 115 345
            L 118 350
            Q 125 358, 130 360
            L 135 362
            Q 150 368, 170 368
            Q 190 368, 205 362
            L 210 360
            Q 215 358, 222 350
            L 225 345
            Q 235 330, 240 310
            Q 248 280, 255 200
            L 260 195
            Q 266 190, 268 180
            L 270 165
            Q 268 150, 258 142
            C 242 130, 210 128, 192 128
            Z"
            fill="url(#skinBase)" stroke="#4a3838" strokeWidth="0.8" />

          {/* Left arm */}
          <path d="
            M 82 142
            Q 65 150, 55 172
            Q 45 195, 42 220
            Q 38 250, 36 275
            Q 34 295, 38 310
            Q 42 320, 40 335
            L 36 360
            Q 34 370, 30 382
            Q 28 388, 32 392
            Q 36 396, 42 392
            L 50 370
            Q 54 355, 56 340
            Q 58 320, 60 305
            Q 65 280, 68 260
            Q 72 235, 74 210
            Q 76 195, 80 185
            Z"
            fill="url(#skinBase)" stroke="#4a3838" strokeWidth="0.6" opacity="0.9" />

          {/* Right arm */}
          <path d="
            M 258 142
            Q 275 150, 285 172
            Q 295 195, 298 220
            Q 302 250, 304 275
            Q 306 295, 302 310
            Q 298 320, 300 335
            L 304 360
            Q 306 370, 310 382
            Q 312 388, 308 392
            Q 304 396, 298 392
            L 290 370
            Q 286 355, 284 340
            Q 282 320, 280 305
            Q 275 280, 272 260
            Q 268 235, 266 210
            Q 264 195, 260 185
            Z"
            fill="url(#skinBase)" stroke="#4a3838" strokeWidth="0.6" opacity="0.9" />

          {/* Left leg */}
          <path d="
            M 130 360
            Q 125 380, 122 410
            Q 118 450, 116 490
            Q 115 520, 114 545
            Q 113 560, 112 572
            Q 110 580, 108 586
            Q 106 592, 110 595
            L 128 596
            Q 132 594, 132 588
            Q 130 575, 128 565
            Q 126 545, 126 520
            Q 128 490, 130 460
            Q 134 430, 138 400
            Q 142 378, 148 368
            Z"
            fill="url(#skinBase)" stroke="#4a3838" strokeWidth="0.6" opacity="0.9" />

          {/* Right leg */}
          <path d="
            M 210 360
            Q 215 380, 218 410
            Q 222 450, 224 490
            Q 225 520, 226 545
            Q 227 560, 228 572
            Q 230 580, 232 586
            Q 234 592, 230 595
            L 212 596
            Q 208 594, 208 588
            Q 210 575, 212 565
            Q 214 545, 214 520
            Q 212 490, 210 460
            Q 206 430, 202 400
            Q 198 378, 192 368
            Z"
            fill="url(#skinBase)" stroke="#4a3838" strokeWidth="0.6" opacity="0.9" />

          {/* Muscle definition lines — subtle */}
          {/* Pectorals */}
          <path d="M 120 155 Q 145 170 170 165" stroke="#4a3838" strokeWidth="0.6" opacity="0.35" fill="none" />
          <path d="M 220 155 Q 195 170 170 165" stroke="#4a3838" strokeWidth="0.6" opacity="0.35" fill="none" />
          {/* Abs center line */}
          <line x1="170" y1="195" x2="170" y2="340" stroke="#4a3838" strokeWidth="0.5" opacity="0.25" />
          {/* Ab segments */}
          <line x1="155" y1="210" x2="185" y2="210" stroke="#4a3838" strokeWidth="0.4" opacity="0.2" />
          <line x1="155" y1="235" x2="185" y2="235" stroke="#4a3838" strokeWidth="0.4" opacity="0.2" />
          <line x1="155" y1="260" x2="185" y2="260" stroke="#4a3838" strokeWidth="0.4" opacity="0.2" />
          <line x1="155" y1="285" x2="185" y2="285" stroke="#4a3838" strokeWidth="0.4" opacity="0.2" />
          {/* Oblique lines */}
          <path d="M 120 200 Q 135 230 145 260" stroke="#4a3838" strokeWidth="0.4" opacity="0.2" fill="none" />
          <path d="M 220 200 Q 205 230 195 260" stroke="#4a3838" strokeWidth="0.4" opacity="0.2" fill="none" />
        </g>

        {/* ═══════════════════════════════════════ */}
        {/* SKELETAL HINTS — ribs, pelvis, spine */}
        {/* ═══════════════════════════════════════ */}
        <g opacity="0.12" stroke="#c0b8b0" fill="none" strokeWidth="0.7">
          {/* Spine */}
          <path d="M 170 100 L 170 355" strokeDasharray="3 4" />
          {/* Rib cage — 12 pairs, curved */}
          {[145, 155, 165, 175, 185, 195, 205, 215, 225, 232].map((y, i) => (
            <g key={`rib-${i}`}>
              <path d={`M 170 ${y} Q ${140 - i * 1.2} ${y + 5} ${115 + i * 1.8} ${y + 10 + i * 0.5}`} />
              <path d={`M 170 ${y} Q ${200 + i * 1.2} ${y + 5} ${225 - i * 1.8} ${y + 10 + i * 0.5}`} />
            </g>
          ))}
          {/* Pelvis outline */}
          <path d="M 130 335 Q 120 345 118 358 Q 120 370 135 372 Q 150 368 170 370 Q 190 368 205 372 Q 220 370 222 358 Q 220 345 210 335" />
          {/* Clavicles */}
          <path d="M 148 130 Q 120 132 90 140" />
          <path d="M 192 130 Q 220 132 250 140" />
          {/* Scapula hints */}
          <ellipse cx="125" cy="165" rx="15" ry="22" opacity="0.5" />
          <ellipse cx="215" cy="165" rx="15" ry="22" opacity="0.5" />
        </g>

        {/* ═══════════════════════════════════════ */}
        {/* CIRCULATORY SYSTEM */}
        {/* ═══════════════════════════════════════ */}
        <g>
          {/* === ARTERIAL (red) === */}
          {/* Aorta — main trunk */}
          <path d="M 165 175 Q 165 168 168 162 Q 175 152 178 160 L 178 195 Q 176 250 174 300 Q 172 330 170 355"
            stroke="url(#arterialFlow)" strokeWidth="3" strokeLinecap="round" opacity="0.7"
            strokeDasharray="0" />

          {/* Aortic arch */}
          <path d="M 165 162 Q 160 148 155 143 Q 148 138 142 140"
            stroke="url(#arterialFlow)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

          {/* Carotid arteries */}
          <path d="M 155 143 Q 152 128 155 110 Q 156 95 158 80"
            stroke="url(#arterialFlow)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
          <path d="M 178 155 Q 182 138 185 120 Q 186 105 184 80"
            stroke="url(#arterialFlow)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />

          {/* Subclavian → Brachial arteries */}
          <path d="M 142 140 Q 120 142 100 150 Q 85 158 70 175 Q 55 200 45 240"
            stroke="url(#arterialFlow)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <path d="M 178 155 Q 210 148 240 150 Q 255 158 270 175 Q 285 200 295 240"
            stroke="url(#arterialFlow)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

          {/* Iliac arteries */}
          <path d="M 170 355 Q 155 365 140 380 Q 128 400 124 430 Q 120 465 118 500 Q 116 540 114 570"
            stroke="url(#arterialFlow)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M 170 355 Q 185 365 200 380 Q 212 400 216 430 Q 220 465 222 500 Q 224 540 226 570"
            stroke="url(#arterialFlow)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />

          {/* Animated blood flow pulses on aorta */}
          <circle r="2.5" fill="#ef5350" opacity="0.8">
            <animateMotion dur="3s" repeatCount="indefinite"
              path="M 165 175 Q 165 168 168 162 Q 175 152 178 160 L 178 195 Q 176 250 174 300 Q 172 330 170 355" />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#ef5350" opacity="0.6">
            <animateMotion dur="3s" repeatCount="indefinite" begin="1.5s"
              path="M 165 175 Q 165 168 168 162 Q 175 152 178 160 L 178 195 Q 176 250 174 300 Q 172 330 170 355" />
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" begin="1.5s" />
          </circle>

          {/* Blood flow to left leg */}
          <circle r="1.8" fill="#ef5350" opacity="0.5">
            <animateMotion dur="4s" repeatCount="indefinite" begin="0.5s"
              path="M 170 355 Q 155 365 140 380 Q 128 400 124 430 Q 120 465 118 500" />
          </circle>
          {/* Blood flow to right leg */}
          <circle r="1.8" fill="#ef5350" opacity="0.5">
            <animateMotion dur="4s" repeatCount="indefinite" begin="2s"
              path="M 170 355 Q 185 365 200 380 Q 212 400 216 430 Q 220 465 222 500" />
          </circle>

          {/* === VENOUS (blue) === */}
          <path d="M 160 355 Q 158 300 156 250 Q 155 220 155 195 Q 155 175 158 165"
            stroke="url(#venousFlow)" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
          {/* Jugular veins */}
          <path d="M 148 110 Q 150 125 152 140"
            stroke="url(#venousFlow)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
          <path d="M 190 110 Q 188 125 186 140"
            stroke="url(#venousFlow)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
          {/* Femoral veins */}
          <path d="M 132 380 Q 138 400 140 430 Q 142 460 142 500"
            stroke="url(#venousFlow)" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
          <path d="M 208 380 Q 202 400 200 430 Q 198 460 198 500"
            stroke="url(#venousFlow)" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
        </g>

        {/* ═══════════════════════════════════════ */}
        {/* ORGANS */}
        {/* ═══════════════════════════════════════ */}

        {/* BRAIN */}
        <g
          onMouseEnter={() => setHoveredOrgan('brain')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('brain', 0.7)}
          filter={hoveredOrgan === 'brain' ? 'url(#organGlow)' : undefined}
        >
          {/* Left hemisphere */}
          <path d="M 170 28 C 155 26, 140 30, 136 42 C 132 55, 138 68, 148 72 Q 158 76, 170 74"
            fill="url(#brainGrad)" stroke="#805050" strokeWidth="0.8" />
          {/* Right hemisphere */}
          <path d="M 170 28 C 185 26, 200 30, 204 42 C 208 55, 202 68, 192 72 Q 182 76, 170 74"
            fill="url(#brainGrad)" stroke="#805050" strokeWidth="0.8" />
          {/* Cerebral fissure */}
          <line x1="170" y1="26" x2="170" y2="74" stroke="#6a4040" strokeWidth="0.6" opacity="0.5" />
          {/* Gyri folds */}
          <path d="M 145 38 Q 150 34 155 40" stroke="#906060" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 148 50 Q 155 46 160 52" stroke="#906060" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 185 38 Q 180 34 175 40" stroke="#906060" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 182 50 Q 177 46 172 52" stroke="#906060" strokeWidth="0.5" fill="none" opacity="0.6" />
          {/* Cerebellum */}
          <ellipse cx="170" cy="72" rx="14" ry="6" fill="#9a6868" stroke="#6a4040" strokeWidth="0.5" opacity="0.8" />
        </g>

        {/* THYROID */}
        <g
          onMouseEnter={() => setHoveredOrgan('thyroid')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('thyroid', isSystemActive(['hormonal']) ? 0.9 : 0.65)}
          filter={hoveredOrgan === 'thyroid' || isSystemActive(['hormonal']) ? 'url(#blueGlow)' : undefined}
        >
          {/* Left lobe */}
          <ellipse cx="162" cy="112" rx="6" ry="10" fill="url(#thyroidGrad)" stroke="#3a5a78" strokeWidth="0.8" />
          {/* Right lobe */}
          <ellipse cx="178" cy="112" rx="6" ry="10" fill="url(#thyroidGrad)" stroke="#3a5a78" strokeWidth="0.8" />
          {/* Isthmus bridge */}
          <rect x="165" y="110" width="10" height="4" rx="2" fill="#5a8aaa" stroke="#3a5a78" strokeWidth="0.5" />
          {/* Breathing animation */}
          <ellipse cx="170" cy="112" rx="16" ry="12" fill="none" stroke="#6a9ab8" strokeWidth="0.5" opacity="0.4">
            <animate attributeName="rx" values="16;18;16" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="4s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* LUNGS */}
        <g
          onMouseEnter={() => setHoveredOrgan('lungs')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('lungs', 0.55)}
        >
          {/* Left lung */}
          <path d="M 158 140 Q 125 148 115 175 Q 108 205 112 230 Q 118 245 135 242 Q 150 238 158 225 Q 162 210 160 190 Z"
            fill="url(#lungGrad)" stroke="#3a5a78" strokeWidth="0.8" />
          {/* Left lung lobes */}
          <path d="M 125 190 Q 140 185 155 192" stroke="#3a5a78" strokeWidth="0.5" fill="none" opacity="0.5" />
          {/* Left bronchi branches */}
          <path d="M 160 155 Q 145 160 135 170" stroke="#5a8aaa" strokeWidth="0.6" fill="none" opacity="0.4" />
          <path d="M 145 163 Q 138 175 130 185" stroke="#5a8aaa" strokeWidth="0.4" fill="none" opacity="0.3" />
          <path d="M 140 168 Q 128 178 122 195" stroke="#5a8aaa" strokeWidth="0.4" fill="none" opacity="0.3" />

          {/* Right lung */}
          <path d="M 182 140 Q 215 148 225 175 Q 232 205 228 230 Q 222 245 205 242 Q 190 238 182 225 Q 178 210 180 190 Z"
            fill="url(#lungGrad)" stroke="#3a5a78" strokeWidth="0.8" />
          {/* Right lung lobes */}
          <path d="M 215 180 Q 200 175 188 182" stroke="#3a5a78" strokeWidth="0.5" fill="none" opacity="0.5" />
          <path d="M 215 200 Q 200 196 188 202" stroke="#3a5a78" strokeWidth="0.5" fill="none" opacity="0.5" />
          {/* Right bronchi branches */}
          <path d="M 180 155 Q 195 160 205 170" stroke="#5a8aaa" strokeWidth="0.6" fill="none" opacity="0.4" />
          <path d="M 195 163 Q 202 175 210 185" stroke="#5a8aaa" strokeWidth="0.4" fill="none" opacity="0.3" />
          <path d="M 200 168 Q 212 178 218 195" stroke="#5a8aaa" strokeWidth="0.4" fill="none" opacity="0.3" />

          {/* Trachea */}
          <path d="M 168 120 L 168 150 Q 168 155 165 158" stroke="#5a8aaa" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <path d="M 172 120 L 172 150 Q 172 155 175 158" stroke="#5a8aaa" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

          {/* Breathing animation */}
          <animateTransform attributeName="transform" type="scale" values="1 1;1 1.012;1 1" dur="4s" repeatCount="indefinite" additive="sum" />
        </g>

        {/* HEART — detailed */}
        <g
          onMouseEnter={() => setHoveredOrgan('heart')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('heart', isSystemActive(['cardiovascular']) ? 0.95 : 0.8)}
          filter={hoveredOrgan === 'heart' || isSystemActive(['cardiovascular']) ? 'url(#softGlow)' : undefined}
        >
          {/* Main heart body */}
          <path d="M 160 160 Q 148 148 145 155 Q 140 165 145 178 Q 152 195 165 200 Q 170 202 175 200 Q 188 195 195 178 Q 200 165 195 155 Q 192 148 180 160 Q 170 170 160 160 Z"
            fill="url(#heartGrad)" stroke="#8e1c1c" strokeWidth="1" />
          {/* Atria */}
          <path d="M 152 155 Q 155 148 162 150" stroke="#e06060" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M 188 155 Q 185 148 178 150" stroke="#e06060" strokeWidth="0.5" fill="none" opacity="0.6" />
          {/* Ventricle division */}
          <path d="M 170 158 Q 168 180 167 200" stroke="#8e1c1c" strokeWidth="0.6" fill="none" opacity="0.5" />

          {/* Pulse animation */}
          <path d="M 160 160 Q 148 148 145 155 Q 140 165 145 178 Q 152 195 165 200 Q 170 202 175 200 Q 188 195 195 178 Q 200 165 195 155 Q 192 148 180 160 Q 170 170 160 160 Z"
            fill="none" stroke="#ff6b6b" strokeWidth="1.5" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="1.2s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="scale" values="1;1.06;1" dur="1.2s" repeatCount="indefinite" additive="sum" />
          </path>

          {/* Pulse ring */}
          <circle cx="170" cy="178" r="20" fill="none" stroke="#ef5350" strokeWidth="1" opacity="0">
            <animate attributeName="r" values="20;32;40" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.2;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* LIVER */}
        <g
          onMouseEnter={() => setHoveredOrgan('liver')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('liver', isSystemActive(['metabolic']) ? 0.8 : 0.6)}
        >
          <path d="M 185 230 Q 220 225 228 240 Q 232 255 225 268 Q 215 278 195 278 Q 180 276 172 268 Q 168 260 172 248 Q 178 235 185 230 Z"
            fill="url(#liverGrad)" stroke="#5a3020" strokeWidth="0.8" />
          {/* Hepatic lobes division */}
          <path d="M 200 232 Q 195 255 192 276" stroke="#5a3020" strokeWidth="0.5" fill="none" opacity="0.5" />
          {/* Gallbladder */}
          <ellipse cx="188" cy="274" rx="4" ry="7" fill="#7aa040" stroke="#4a7020" strokeWidth="0.5" opacity="0.5" />
        </g>

        {/* STOMACH */}
        <g
          onMouseEnter={() => setHoveredOrgan('stomach')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('stomach', isSystemActive(['metabolic', 'nutritional']) ? 0.75 : 0.55)}
        >
          <path d="M 155 238 Q 140 235 132 248 Q 128 262 135 278 Q 145 292 158 290 Q 168 286 170 272 Q 172 258 165 245 Q 160 238 155 238 Z"
            fill="url(#stomachGrad)" stroke="#6a4020" strokeWidth="0.8" />
          {/* Rugae folds */}
          <path d="M 138 258 Q 150 254 160 260" stroke="#6a4020" strokeWidth="0.4" fill="none" opacity="0.4" />
          <path d="M 140 270 Q 150 266 158 272" stroke="#6a4020" strokeWidth="0.4" fill="none" opacity="0.4" />
        </g>

        {/* PANCREAS */}
        <g
          onMouseEnter={() => setHoveredOrgan('pancreas')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('pancreas', isSystemActive(['metabolic']) ? 0.85 : 0.55)}
        >
          <path d="M 145 288 Q 158 282 175 284 Q 195 286 205 292 Q 210 296 205 300 Q 195 304 175 302 Q 155 300 145 296 Q 140 293 145 288 Z"
            fill="url(#pancreasGrad)" stroke="#7a5820" strokeWidth="0.7" />
          {/* Glow animation for metabolic */}
          {isSystemActive(['metabolic']) && (
            <path d="M 145 288 Q 158 282 175 284 Q 195 286 205 292 Q 210 296 205 300 Q 195 304 175 302 Q 155 300 145 296 Q 140 293 145 288 Z"
              fill="none" stroke="#d4a856" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;0.6;0" dur="2.5s" repeatCount="indefinite" />
            </path>
          )}
        </g>

        {/* KIDNEYS */}
        <g
          onMouseEnter={() => setHoveredOrgan('kidneys')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('kidneys', 0.6)}
        >
          {/* Left kidney */}
          <path d="M 125 268 Q 118 275 118 290 Q 120 305 128 310 Q 135 312 138 305 Q 140 295 138 282 Q 135 270 125 268 Z"
            fill="url(#kidneyGrad)" stroke="#4a2828" strokeWidth="0.7" />
          {/* Left kidney hilum */}
          <path d="M 135 285 Q 132 290 135 296" stroke="#4a2828" strokeWidth="0.5" fill="none" opacity="0.5" />

          {/* Right kidney */}
          <path d="M 215 268 Q 222 275 222 290 Q 220 305 212 310 Q 205 312 202 305 Q 200 295 202 282 Q 205 270 215 268 Z"
            fill="url(#kidneyGrad)" stroke="#4a2828" strokeWidth="0.7" />
          {/* Right kidney hilum */}
          <path d="M 205 285 Q 208 290 205 296" stroke="#4a2828" strokeWidth="0.5" fill="none" opacity="0.5" />

          {/* Renal arteries */}
          <path d="M 172 282 L 140 285" stroke="#ef5350" strokeWidth="1" opacity="0.35" strokeLinecap="round" />
          <path d="M 172 282 L 200 285" stroke="#ef5350" strokeWidth="1" opacity="0.35" strokeLinecap="round" />
        </g>

        {/* INTESTINES */}
        <g
          onMouseEnter={() => setHoveredOrgan('intestines')}
          onMouseLeave={() => setHoveredOrgan(null)}
          style={{ cursor: 'pointer' }}
          opacity={organOpacity('intestines', isSystemActive(['nutritional']) ? 0.7 : 0.45)}
        >
          {/* Large intestine (colon) frame */}
          <path d="M 130 300 Q 128 315 130 330 Q 135 348 155 350 L 185 350 Q 205 348 210 330 Q 212 315 210 300"
            fill="none" stroke="url(#intestineGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />

          {/* Small intestine loops */}
          <path d="M 148 305 Q 155 310 160 305 Q 165 300 172 305 Q 178 310 185 305 Q 190 300 195 305"
            stroke="#c08080" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M 145 315 Q 152 320 158 315 Q 164 310 170 315 Q 176 320 182 315 Q 188 310 194 315"
            stroke="#c08080" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M 148 325 Q 155 330 162 325 Q 168 320 175 325 Q 182 330 188 325"
            stroke="#c08080" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
          <path d="M 152 335 Q 158 340 165 335 Q 172 330 178 335 Q 184 340 190 335"
            stroke="#c08080" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round" />

          {/* Digestive flow animation */}
          <circle r="1.5" fill="#c08080" opacity="0.5">
            <animateMotion dur="5s" repeatCount="indefinite"
              path="M 130 300 Q 128 315 130 330 Q 135 348 155 350 L 185 350 Q 205 348 210 330 Q 212 315 210 300" />
          </circle>
        </g>

        {/* ═══════════════════════════════════════ */}
        {/* NERVOUS SYSTEM HINTS */}
        {/* ═══════════════════════════════════════ */}
        <g opacity="0.15" stroke="#e0d880" strokeWidth="0.5" fill="none">
          {/* Spinal cord */}
          <path d="M 170 75 L 170 355" strokeDasharray="2 3" />
          {/* Major nerve branches */}
          <path d="M 170 135 Q 145 140 115 155" />
          <path d="M 170 135 Q 195 140 225 155" />
          <path d="M 170 280 Q 150 290 130 310" />
          <path d="M 170 280 Q 190 290 210 310" />
          <path d="M 170 355 Q 150 370 135 400" />
          <path d="M 170 355 Q 190 370 205 400" />
        </g>

        {/* ═══════════════════════════════════════ */}
        {/* HOVER TOOLTIP */}
        {/* ═══════════════════════════════════════ */}
        {hoveredOrgan && ORGAN_LABELS[hoveredOrgan] && (
          <g>
            <rect x="135" y="4" width="70" height="18" rx="4" fill="rgba(0,0,0,0.75)" />
            <text x="170" y="16" textAnchor="middle" fill="#e0dcd4" fontSize="10" fontFamily="system-ui">
              {ORGAN_LABELS[hoveredOrgan]}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 text-[10px] space-y-1 opacity-60">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef5350' }} />
          <span style={{ color: '#a09890' }}>Arterial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5c6bc0' }} />
          <span style={{ color: '#a09890' }}>Venous</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e0d880' }} />
          <span style={{ color: '#a09890' }}>Nervous</span>
        </div>
      </div>
    </div>
  );
}
