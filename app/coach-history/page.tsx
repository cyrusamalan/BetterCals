'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { AlertCircle, ArrowLeft, Bot, CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Mic, User } from 'lucide-react';
import { CoachHistoryEvent, CoachHistoryTurn } from '@/types';
import { CoachHistoryPageSkeleton } from '@/components/Skeleton';

function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatTimeLabel(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isLiveSource(source: CoachHistoryEvent['source']) {
  return source === 'live_mic' || source === 'live_model';
}

function toUtcIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toTurns(events: CoachHistoryEvent[]): CoachHistoryTurn[] {
  const turns: CoachHistoryTurn[] = [];
  let pendingUser: CoachHistoryEvent | null = null;

  for (const event of [...events].reverse()) {
    const sourceFamily: CoachHistoryTurn['sourceFamily'] = isLiveSource(event.source) ? 'live' : 'text';
    if (event.role === 'user') {
      if (pendingUser) {
        turns.push({ day: pendingUser.eventDateUtc, sourceFamily: isLiveSource(pendingUser.source) ? 'live' : 'text', user: pendingUser });
      }
      pendingUser = event;
      continue;
    }

    if (pendingUser) {
      const pendingFamily: CoachHistoryTurn['sourceFamily'] = isLiveSource(pendingUser.source) ? 'live' : 'text';
      if (pendingFamily === sourceFamily && pendingUser.eventDateUtc === event.eventDateUtc) {
        turns.push({ day: pendingUser.eventDateUtc, sourceFamily, user: pendingUser, assistant: event });
        pendingUser = null;
        continue;
      }
      turns.push({ day: pendingUser.eventDateUtc, sourceFamily: pendingFamily, user: pendingUser });
      pendingUser = null;
    }

    turns.push({ day: event.eventDateUtc, sourceFamily, assistant: event });
  }

  if (pendingUser) {
    turns.push({
      day: pendingUser.eventDateUtc,
      sourceFamily: isLiveSource(pendingUser.source) ? 'live' : 'text',
      user: pendingUser,
    });
  }

  return turns.reverse();
}

export default function CoachHistoryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [events, setEvents] = useState<CoachHistoryEvent[]>([]);
  const [messageDays, setMessageDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
    setViewMonth(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!calendarRef.current) return;
      if (calendarRef.current.contains(event.target as Node)) return;
      setCalendarOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [calendarOpen]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    if (!selectedDate) return;

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ date: selectedDate, limit: String(limit) });
        const res = await fetch(`/api/coach/history?${query.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch coach history (${res.status})`);
        const data = (await res.json()) as CoachHistoryEvent[];
        setEvents(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [isLoaded, isSignedIn, selectedDate, limit]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const controller = new AbortController();
    async function loadMessageDays() {
      try {
        const res = await fetch('/api/coach/history?limit=200', { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as CoachHistoryEvent[];
        setMessageDays(new Set(data.map((event) => event.eventDateUtc)));
      } catch {
        // Non-blocking enhancement only.
      }
    }
    loadMessageDays();
    return () => controller.abort();
  }, [isLoaded, isSignedIn]);

  const turns = useMemo(() => toTurns(events), [events]);
  const groupedTurns = useMemo(() => {
    const map = new Map<string, CoachHistoryTurn[]>();
    for (const t of turns) {
      const prev = map.get(t.day) ?? [];
      prev.push(t);
      map.set(t.day, prev);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [turns]);

  const calendarGrid = useMemo(() => {
    const year = viewMonth.getUTCFullYear();
    const month = viewMonth.getUTCMonth();
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: Array<{ day: number; isoDate: string } | null> = [];

    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(Date.UTC(year, month, day));
      cells.push({ day, isoDate: toUtcIsoDate(d) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  if (!isLoaded || loading) return <CoachHistoryPageSkeleton />;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-warm)' }}>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
            Sign in to view coach conversation history.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-press" style={{ background: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-warm)' }}>
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors hover:opacity-80" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Coach History</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Review prior coach conversations as paired turns by day (UTC).
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-12 space-y-4">
        <section className="rounded-2xl p-4 noise" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-xs font-medium relative" style={{ color: 'var(--text-secondary)' }} ref={calendarRef}>
              UTC Date
              <button
                type="button"
                className="w-full mt-1 px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-between btn-press"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-warm)', color: 'var(--text-primary)' }}
                onClick={() => setCalendarOpen((open) => !open)}
              >
                <span>{selectedDate ? formatDateLabel(selectedDate) : 'Select date'}</span>
                <CalendarDays className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
              {calendarOpen && (
                <div
                  className="absolute z-20 mt-2 w-[296px] rounded-2xl p-3"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg btn-press"
                      style={{ border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                      onClick={() =>
                        setViewMonth((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 1, 1)))
                      }
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </p>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg btn-press"
                      style={{ border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                      onClick={() =>
                        setViewMonth((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)))
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="text-center py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.map((cell, idx) =>
                      cell ? (
                        <button
                          key={cell.isoDate}
                          type="button"
                          className="h-10 rounded-lg text-sm font-medium btn-press flex flex-col items-center justify-center"
                          style={{
                            backgroundColor: selectedDate === cell.isoDate ? 'var(--accent)' : 'var(--bg-warm)',
                            color: selectedDate === cell.isoDate ? 'var(--text-inverse)' : 'var(--text-primary)',
                            border: `1px solid ${selectedDate === cell.isoDate ? 'var(--accent)' : 'var(--border-light)'}`,
                          }}
                          onClick={() => {
                            setSelectedDate(cell.isoDate);
                            setCalendarOpen(false);
                          }}
                        >
                          <span className="leading-none">{cell.day}</span>
                          {messageDays.has(cell.isoDate) && (
                            <span
                              className="mt-1 w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor: selectedDate === cell.isoDate ? 'rgba(255,255,255,0.92)' : 'var(--accent)',
                              }}
                            />
                          )}
                        </button>
                      ) : (
                        <div key={`blank-${idx}`} className="h-10" />
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full mt-2 h-9 rounded-lg text-xs font-semibold btn-press"
                    style={{ border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-warm)', color: 'var(--text-secondary)' }}
                    onClick={() => {
                      const today = new Date();
                      const iso = toUtcIsoDate(today);
                      setSelectedDate(iso);
                      setViewMonth(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
                      setCalendarOpen(false);
                    }}
                  >
                    Jump to Today (UTC)
                  </button>
                </div>
              )}
            </div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Limit
              <select className="select-field mt-1" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
            <div className="text-xs rounded-xl px-3 py-2 flex items-center justify-between" style={{ border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-warm)', color: 'var(--text-secondary)' }}>
              <span>Total messages</span>
              <strong style={{ color: 'var(--text-primary)' }}>{events.length}</strong>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--status-danger)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--status-danger)' }}>Could not load coach history</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </section>
        ) : groupedTurns.length === 0 ? (
          <section className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No coach history for this date.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Ask a coach question on the results page, then refresh here.</p>
            <Link href="/analyze" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold btn-press" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
              Go to Analyze
            </Link>
          </section>
        ) : (
          groupedTurns.map(([day, dayTurns]) => (
            <section key={day} className="rounded-2xl overflow-hidden noise" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <CalendarDays className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDateLabel(day)} (UTC)</h2>
              </div>
              <div className="px-4 py-3 space-y-4">
                {dayTurns.map((turn, idx) => (
                  <div key={`${day}-${idx}`} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
                    <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: 'var(--text-tertiary)' }}>
                      {turn.sourceFamily === 'live' ? <Mic className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                      {turn.sourceFamily === 'live' ? 'Live Turn' : 'Text Turn'}
                    </div>
                    {turn.user && (
                      <div className="mb-2">
                        <div className="text-[11px] font-medium flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          <User className="w-3.5 h-3.5" />
                          You · {formatTimeLabel(turn.user.createdAt)}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{turn.user.message}</p>
                      </div>
                    )}
                    {turn.assistant && (
                      <div>
                        <div className="text-[11px] font-medium flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          <Bot className="w-3.5 h-3.5" />
                          Coach · {formatTimeLabel(turn.assistant.createdAt)}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{turn.assistant.message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
