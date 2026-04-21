'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Activity,
  Droplet,
  Flame,
  Zap,
  Sun,
  Leaf,
  Wind,
  Beaker,
  FlaskConical,
  Shield,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';

type CategoryId = 'all' | 'metabolic' | 'lipids' | 'inflammation' | 'nutrients' | 'organ';

interface Category {
  id: CategoryId;
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'all',
    label: 'All',
    accent: 'var(--text-primary)',
    accentBg: 'var(--border-light)',
    accentBorder: 'var(--border)',
  },
  {
    id: 'metabolic',
    label: 'Metabolic',
    accent: 'var(--accent)',
    accentBg: 'var(--accent-subtle)',
    accentBorder: 'rgba(107, 143, 113, 0.22)',
  },
  {
    id: 'lipids',
    label: 'Lipids',
    accent: 'var(--status-warning)',
    accentBg: 'var(--status-warning-bg)',
    accentBorder: 'var(--status-warning-border)',
  },
  {
    id: 'inflammation',
    label: 'Inflammation',
    accent: 'var(--status-danger)',
    accentBg: 'var(--status-danger-bg)',
    accentBorder: 'var(--status-danger-border)',
  },
  {
    id: 'nutrients',
    label: 'Nutrients',
    accent: 'var(--accent-rose)',
    accentBg: 'rgba(160, 90, 90, 0.10)',
    accentBorder: 'rgba(160, 90, 90, 0.22)',
  },
  {
    id: 'organ',
    label: 'Organs',
    accent: 'var(--status-info)',
    accentBg: 'var(--status-info-bg)',
    accentBorder: 'var(--status-info-border)',
  },
];

interface Marker {
  id: string;
  name: string;
  category: Exclude<CategoryId, 'all'>;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  whatItIs: string;
  whyItMatters: string;
  range: string;
}

const MARKERS: Marker[] = [
  // ── Metabolic ──
  {
    id: 'glucose',
    name: 'Glucose',
    category: 'metabolic',
    icon: Zap,
    tagline: 'Fuel in your bloodstream right now.',
    whatItIs: 'Sugar circulating in your blood after digesting food. The body’s main quick-energy source.',
    whyItMatters: 'Chronically high glucose is an early warning sign for diabetes and damages blood vessels over time.',
    range: 'Fasting: 70–99 mg/dL',
  },
  {
    id: 'hba1c',
    name: 'HbA1c',
    category: 'metabolic',
    icon: Activity,
    tagline: 'Your 3-month blood-sugar report card.',
    whatItIs: 'The percentage of red blood cells coated in sugar. Gives a long average — no fasting needed.',
    whyItMatters: 'A single meal can spike glucose, but HbA1c shows whether that pattern is the norm.',
    range: 'Optimal: below 5.4%',
  },
  {
    id: 'fastingInsulin',
    name: 'Fasting Insulin',
    category: 'metabolic',
    icon: Droplet,
    tagline: 'How hard your body works to manage sugar.',
    whatItIs: 'The hormone that moves sugar from blood into cells. Measured first thing in the morning before eating.',
    whyItMatters: 'Elevated fasting insulin appears years before glucose rises — it’s the earliest metabolic red flag.',
    range: 'Optimal: 2–8 µIU/mL',
  },

  // ── Lipids ──
  {
    id: 'totalCholesterol',
    name: 'Total Cholesterol',
    category: 'lipids',
    icon: Beaker,
    tagline: 'All cholesterol in your blood — context, not a verdict.',
    whatItIs: 'The sum of LDL + HDL + other cholesterol particles. A headline number that hides the details.',
    whyItMatters: 'By itself it tells you little. The split between LDL and HDL matters far more.',
    range: 'Target: below 200 mg/dL',
  },
  {
    id: 'ldl',
    name: 'LDL Cholesterol',
    category: 'lipids',
    icon: ArrowRight,
    tagline: 'Cholesterol heading out into the body.',
    whatItIs: 'Low-density lipoprotein carries cholesterol to your tissues. Too much can park in artery walls.',
    whyItMatters: 'High LDL is a primary driver of heart disease. Lower is generally better.',
    range: 'Optimal: below 100 mg/dL',
  },
  {
    id: 'hdl',
    name: 'HDL Cholesterol',
    category: 'lipids',
    icon: Shield,
    tagline: 'The cleanup crew, headed back to the liver.',
    whatItIs: 'High-density lipoprotein hauls cholesterol away from arteries and back to the liver for recycling.',
    whyItMatters: 'Higher HDL is protective — it’s part of the body’s traffic-control system for cholesterol.',
    range: 'Optimal: above 60 mg/dL',
  },
  {
    id: 'triglycerides',
    name: 'Triglycerides',
    category: 'lipids',
    icon: Flame,
    tagline: 'Stored fat floating through your blood.',
    whatItIs: 'The main form of fat your body stores and uses for energy between meals.',
    whyItMatters: 'Spike after sugary or alcoholic meals. High fasting values signal metabolic strain.',
    range: 'Optimal: below 100 mg/dL',
  },
  {
    id: 'apoB',
    name: 'ApoB',
    category: 'lipids',
    icon: FlaskConical,
    tagline: 'The actual count of artery-clogging particles.',
    whatItIs: 'Every atherogenic particle carries one ApoB protein. Counting them is more accurate than measuring cholesterol mass.',
    whyItMatters: 'A sharper cardiovascular risk signal than LDL — modern lipidology leans on this.',
    range: 'Optimal: below 90 mg/dL',
  },

  // ── Inflammation ──
  {
    id: 'hsCRP',
    name: 'hs-CRP',
    category: 'inflammation',
    icon: Flame,
    tagline: 'A smoke alarm for whole-body inflammation.',
    whatItIs: 'A sensitive protein the liver releases when the body senses inflammation.',
    whyItMatters: 'Low-grade inflammation silently compounds heart disease, diabetes, and aging-related risks.',
    range: 'Optimal: below 1.0 mg/L',
  },

  // ── Nutrients ──
  {
    id: 'vitaminD',
    name: 'Vitamin D',
    category: 'nutrients',
    icon: Sun,
    tagline: 'A hormone disguised as a vitamin.',
    whatItIs: 'Made in your skin from sunlight. Regulates calcium, mood, immune response, and much more.',
    whyItMatters: 'Deficiency is extremely common indoors and affects bone health, energy, and immunity.',
    range: 'Optimal: 40–60 ng/mL',
  },
  {
    id: 'vitaminB12',
    name: 'Vitamin B12',
    category: 'nutrients',
    icon: Leaf,
    tagline: 'Keeps nerves firing and red blood cells flowing.',
    whatItIs: 'An essential nutrient found mostly in animal foods. Stored in the liver for years.',
    whyItMatters: 'Low levels cause fatigue, brain fog, and nerve issues. Common in vegetarians and older adults.',
    range: 'Optimal: 500–900 pg/mL',
  },
  {
    id: 'ferritin',
    name: 'Ferritin',
    category: 'nutrients',
    icon: Beaker,
    tagline: 'Your body’s iron savings account.',
    whatItIs: 'A storage protein that holds iron in reserve. Best single indicator of long-term iron status.',
    whyItMatters: 'Low = fatigue and poor exercise recovery. Very high = inflammation or iron overload.',
    range: 'Optimal: 30–150 ng/mL',
  },
  {
    id: 'iron',
    name: 'Iron',
    category: 'nutrients',
    icon: Droplet,
    tagline: 'Oxygen’s delivery courier.',
    whatItIs: 'Iron in your blood right now — the part actively ferrying oxygen to tissues.',
    whyItMatters: 'Too little starves tissues of oxygen; too much stresses the liver and heart.',
    range: 'Optimal: 60–170 µg/dL',
  },

  // ── Organs ──
  {
    id: 'tsh',
    name: 'TSH',
    category: 'organ',
    icon: Wind,
    tagline: 'Your thyroid’s thermostat dial.',
    whatItIs: 'The brain’s signal telling the thyroid to speed up or slow down hormone production.',
    whyItMatters: 'An out-of-range TSH is the first hint of thyroid trouble — energy, weight, mood, and temperature all shift with it.',
    range: 'Optimal: 0.5–2.5 mIU/L',
  },
  {
    id: 'alt',
    name: 'ALT',
    category: 'organ',
    icon: FlaskConical,
    tagline: 'An enzyme that leaks when liver cells are stressed.',
    whatItIs: 'Mostly found inside liver cells. Rising ALT means cells are being damaged and spilling their contents.',
    whyItMatters: 'Elevations often point to fatty liver — now one of the most common chronic conditions.',
    range: 'Optimal: below 30 U/L',
  },
  {
    id: 'ast',
    name: 'AST',
    category: 'organ',
    icon: FlaskConical,
    tagline: 'ALT’s cousin — found in liver and muscle.',
    whatItIs: 'Similar to ALT but also abundant in muscle, so intense workouts can bump it.',
    whyItMatters: 'Paired with ALT to pin down whether the signal is coming from the liver or elsewhere.',
    range: 'Optimal: below 30 U/L',
  },
  {
    id: 'albumin',
    name: 'Albumin',
    category: 'organ',
    icon: Shield,
    tagline: 'The most abundant protein in your blood.',
    whatItIs: 'Made by the liver. Keeps fluid inside blood vessels and shuttles hormones, drugs, and nutrients.',
    whyItMatters: 'Reflects liver output and overall nutritional status. Low values accompany chronic illness or malnutrition.',
    range: 'Optimal: 3.8–5.0 g/dL',
  },
  {
    id: 'creatinine',
    name: 'Creatinine',
    category: 'organ',
    icon: Beaker,
    tagline: 'Muscle waste your kidneys filter out.',
    whatItIs: 'A by-product of normal muscle activity, cleared from blood entirely by the kidneys.',
    whyItMatters: 'Rising creatinine signals the kidneys aren’t filtering as well as they used to.',
    range: 'Optimal: 0.7–1.2 mg/dL',
  },
  {
    id: 'uricAcid',
    name: 'Uric Acid',
    category: 'organ',
    icon: Flame,
    tagline: 'A purine by-product — the cause of gout.',
    whatItIs: 'Comes from cell turnover and certain foods (red meat, seafood, alcohol).',
    whyItMatters: 'High levels crystallize in joints (gout) and quietly raise cardiovascular and kidney risk.',
    range: 'Optimal: 3.5–6.0 mg/dL',
  },
];

export default function LearnMarkersModal({
  open,
  onCloseAction,
}: {
  open: boolean;
  onCloseAction: () => void;
}) {
  const [category, setCategory] = useState<CategoryId>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseAction();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCloseAction]);

  useEffect(() => {
    if (!open) {
      setCategory('all');
      setQuery('');
      setExpandedId(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKERS.filter((m) => {
      if (category !== 'all' && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        m.whatItIs.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const categoryMeta = (id: Marker['category']) =>
    CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease both',
        }}
        onClick={onCloseAction}
      />

      {/* Centering wrapper */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none"
      >
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-markers-title"
        className="anim-scale-in pointer-events-auto"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: 'calc(100vh - 24px)',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow-heavy, 0 25px 60px rgba(0,0,0,0.25))',
        }}
      >
        {/* Header */}
        <div
          className="relative px-5 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          {/* Decorative gradient sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(600px 220px at 100% -40%, var(--accent-subtle), transparent 70%)',
              opacity: 0.9,
            }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase mb-2"
                style={{
                  backgroundColor: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(107, 143, 113, 0.22)',
                }}
              >
                <Sparkles className="w-3 h-3" />
                Learn
              </div>
              <h2
                id="learn-markers-title"
                className="font-display text-2xl sm:text-3xl leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Know your markers.
              </h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                Plain-English explanations. No medical jargon required.
              </p>
            </div>
            <button
              onClick={onCloseAction}
              aria-label="Close"
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center btn-press transition-colors"
              style={{
                background: 'var(--border-light)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search + categories */}
          <div className="relative mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-shrink-0 sm:w-60">
              <Search
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markers…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none transition-colors"
                style={{
                  background: 'var(--border-light)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div
              className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0"
              style={{ scrollbarWidth: 'none' }}
            >
              {CATEGORIES.map((c) => {
                const active = c.id === category;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold btn-press transition-all"
                    style={{
                      background: active ? c.accentBg : 'transparent',
                      color: active ? c.accent : 'var(--text-secondary)',
                      border: `1px solid ${active ? c.accentBorder : 'var(--border-light)'}`,
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 sm:py-6"
          style={{ scrollBehavior: 'smooth' }}
        >
          {filtered.length === 0 ? (
            <div
              className="text-center py-16 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No markers match “{query}”.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((m, i) => {
                const meta = categoryMeta(m.category);
                const isOpen = expandedId === m.id;
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    className="relative"
                    style={{
                      animation: `fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`,
                      animationDelay: `${Math.min(i * 40, 400)}ms`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : m.id)}
                      aria-expanded={isOpen}
                      className="w-full text-left rounded-2xl p-4 transition-all duration-300 marker-card-hover"
                      style={{
                        background: isOpen ? meta.accentBg : 'var(--surface)',
                        border: `1px solid ${isOpen ? meta.accentBorder : 'var(--border-light)'}`,
                        boxShadow: isOpen
                          ? '0 10px 28px rgba(0,0,0,0.08)'
                          : '0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                          style={{
                            background: meta.accentBg,
                            border: `1px solid ${meta.accentBorder}`,
                            color: meta.accent,
                            transform: isOpen ? 'scale(1.08)' : 'scale(1)',
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className="text-sm font-semibold truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {m.name}
                            </h3>
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
                              style={{ color: meta.accent }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <p
                            className="text-xs mt-1 leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {m.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Expandable detail */}
                      <div
                        className="grid transition-all duration-[400ms] ease-out"
                        style={{
                          gridTemplateRows: isOpen ? '1fr' : '0fr',
                          opacity: isOpen ? 1 : 0,
                          marginTop: isOpen ? 14 : 0,
                        }}
                      >
                        <div className="overflow-hidden">
                          <div
                            className="pt-3 space-y-3"
                            style={{ borderTop: `1px dashed ${meta.accentBorder}` }}
                          >
                            <div>
                              <p
                                className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
                                style={{ color: meta.accent }}
                              >
                                What it is
                              </p>
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {m.whatItIs}
                              </p>
                            </div>
                            <div>
                              <p
                                className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
                                style={{ color: meta.accent }}
                              >
                                Why it matters
                              </p>
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {m.whyItMatters}
                              </p>
                            </div>
                            <div
                              className="rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                              style={{
                                background: 'var(--surface)',
                                border: `1px solid ${meta.accentBorder}`,
                              }}
                            >
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wide"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Healthy range
                              </span>
                              <span
                                className="text-xs font-semibold"
                                style={{ color: meta.accent }}
                              >
                                {m.range}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 sm:px-7 py-3 sm:py-4"
          style={{
            borderTop: '1px solid var(--border-light)',
            background: 'var(--surface)',
          }}
        >
          <p
            className="text-[11px] leading-snug hidden sm:block"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Educational — not medical advice. Ranges vary by lab and individual.
          </p>
          <p
            className="text-[11px] leading-snug sm:hidden"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Educational only.
          </p>
          <button
            onClick={onCloseAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-press"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: 'var(--text-inverse)',
              boxShadow: '0 2px 6px rgba(107, 143, 113, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            Got it
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      </div>

      <style>{`
        .marker-card-hover {
          cursor: pointer;
        }
        .marker-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.07) !important;
        }
        @media (hover: none) {
          .marker-card-hover:hover {
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
