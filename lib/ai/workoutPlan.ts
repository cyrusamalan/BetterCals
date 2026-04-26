import type { AnalysisResult, BloodMarkers, UserProfile, WorkoutPlan, WorkoutPreferenceOption, WorkoutIntensity } from '@/types';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

export interface WorkoutPlanInput {
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
  constraints: {
    selected: string[];
    notes?: string;
  };
  preferences: {
    selected: WorkoutPreferenceOption[];
  };
}

export interface WorkoutPlanOutcome {
  plan: WorkoutPlan;
  fallbackUsed: boolean;
  error?: string;
}

export async function generateWorkoutPlan(input: WorkoutPlanInput): Promise<WorkoutPlanOutcome> {
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

  if (!apiKey && !isLocal) {
    return { plan: buildFallbackWorkoutPlan(input), fallbackUsed: true, error: 'LLM not configured' };
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isLocal) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        temperature: 0.35,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        plan: buildFallbackWorkoutPlan(input),
        fallbackUsed: true,
        error: `LLM request failed: ${errorText.slice(0, 200)}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      return { plan: buildFallbackWorkoutPlan(input), fallbackUsed: true, error: 'Empty LLM response' };
    }

    const parsed = parseJson(text);
    const validated = validateWorkoutPlan(parsed, input, model);
    if (!validated) {
      return { plan: buildFallbackWorkoutPlan(input), fallbackUsed: true, error: 'Invalid LLM JSON shape' };
    }
    return { plan: validated, fallbackUsed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { plan: buildFallbackWorkoutPlan(input), fallbackUsed: true, error: message };
  }
}

function buildSystemPrompt(): string {
  return [
    'You are a certified strength and conditioning coach creating a safe, personalized 7-day workout plan.',
    'Use user profile, blood markers, calorie/macro targets, movement limitations, and preferred exercise styles.',
    '',
    'HARD CONSTRAINTS:',
    '1) Respect all listed physical limitations and pain areas. Provide low-impact substitutions.',
    '2) Keep intensity age-appropriate and realistic for general fitness users.',
    '3) Include explicit warmup and cooldown for each session.',
    '4) Output STRICT JSON only.',
    '',
    'OUTPUT SHAPE:',
    '{',
    '  "summary": "1-2 sentences",',
    '  "weeklyGoal": "string",',
    '  "sessions": [',
    '    {',
    '      "day": "Mon",',
    '      "focus": "Upper body strength",',
    '      "durationMinutes": 45,',
    '      "intensity": "low|moderate|moderate-high",',
    '      "warmup": ["..."],',
    '      "main": ["..."],',
    '      "cooldown": ["..."],',
    '      "modifications": ["..."]',
    '    }',
    '  ],',
    '  "recoveryNotes": ["..."],',
    '  "safetyNotes": ["..."],',
    '  "equipmentNotes": ["..."]',
    '}',
    '',
    'Return 4-7 sessions across the week.',
  ].join('\n');
}

function buildUserPrompt(input: WorkoutPlanInput): string {
  const { profile, markers, result, constraints, preferences } = input;
  const payload = {
    profile: {
      age: profile.age,
      gender: profile.gender,
      goal: profile.goal,
      focusGoal: profile.focusGoal ?? [],
      activityLevel: profile.activityLevel,
      weightLbs: profile.weightLbs,
    },
    dietContext: {
      targetCalories: result.tdee.targetCalories,
      macroTargets: result.macros,
      dietPlanSummary: result.dietPlan?.summary ?? null,
    },
    markerContext: {
      hsCRP: markers.hsCRP,
      ferritin: markers.ferritin,
      vitaminD: markers.vitaminD,
      ldl: markers.ldl,
      glucose: markers.glucose,
      hba1c: markers.hba1c,
    },
    constraints,
    preferences,
  };

  return [
    'Generate a safe and personalized weekly workout plan from this JSON.',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function parseJson(text: string): unknown {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const candidates = [normalized];
  const start = normalized.indexOf('{');
  const end = normalized.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(normalized.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        // continue
      }
    }
  }
  return null;
}

function validateWorkoutPlan(raw: unknown, input: WorkoutPlanInput, modelUsed?: string): WorkoutPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const sessionsRaw = Array.isArray(obj.sessions) ? obj.sessions : null;
  if (!sessionsRaw || sessionsRaw.length === 0) return null;

  const sessions = sessionsRaw
    .map((session) => {
      if (!session || typeof session !== 'object') return null;
      const row = session as Record<string, unknown>;
      const day = typeof row.day === 'string' ? row.day.slice(0, 24) : null;
      const focus = typeof row.focus === 'string' ? row.focus.slice(0, 200) : null;
      const duration = num(row.durationMinutes);
      const intensity = parseWorkoutIntensity(row.intensity);
      if (!day || !focus || duration === null) return null;
      if (!intensity) return null;
      return {
        day,
        focus,
        durationMinutes: Math.round(Math.max(10, Math.min(180, duration))),
        intensity,
        warmup: toStringArray(row.warmup, 10, 200),
        main: toStringArray(row.main, 20, 200),
        cooldown: toStringArray(row.cooldown, 10, 200),
        modifications: toStringArray(row.modifications, 12, 240),
      };
    })
    .filter((session): session is NonNullable<typeof session> => session !== null);

  if (sessions.length < 3) return null;

  return {
    generatedAt: new Date().toISOString(),
    summary: typeof obj.summary === 'string' ? obj.summary.slice(0, 1200) : 'Personalized weekly workout plan.',
    weeklyGoal: typeof obj.weeklyGoal === 'string' ? obj.weeklyGoal.slice(0, 240) : `Support your ${input.profile.goal} goal.`,
    sessions,
    recoveryNotes: toStringArray(obj.recoveryNotes, 12, 300),
    safetyNotes: toStringArray(obj.safetyNotes, 12, 300),
    equipmentNotes: toStringArray(obj.equipmentNotes, 12, 240),
    modelUsed,
  };
}

function toStringArray(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.slice(0, maxLen))
    .slice(0, maxItems);
}

function num(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function parseWorkoutIntensity(value: unknown): WorkoutIntensity | null {
  if (value === 'low' || value === 'moderate' || value === 'moderate-high') return value;
  return null;
}

function buildFallbackWorkoutPlan(input: WorkoutPlanInput): WorkoutPlan {
  const hasPain = input.constraints.selected.some((item) => item !== 'none');
  const preferred = input.preferences.selected[0] ?? 'mixed-balanced';

  return {
    generatedAt: new Date().toISOString(),
    summary: 'A conservative weekly workout structure based on your profile and selected movement preferences.',
    weeklyGoal: `Build consistency and safe progression for your ${input.profile.goal} goal.`,
    sessions: [
      {
        day: 'Monday',
        focus: preferred === 'walking-cardio' ? 'Cardio base walk + mobility' : 'Full body strength basics',
        durationMinutes: 40,
        intensity: 'moderate',
        warmup: ['5-8 min brisk walk', 'Dynamic hip and shoulder mobility'],
        main: preferred === 'walking-cardio'
          ? ['25 min steady-state walk', '5 x 1 min faster pace intervals']
          : ['Goblet squat 3x8', 'Incline push-up 3x8', 'Dumbbell row 3x10'],
        cooldown: ['5 min easy walk', 'Breathing and light stretching'],
        modifications: hasPain ? ['Reduce range of motion and use controlled tempo if discomfort appears.'] : [],
      },
      {
        day: 'Wednesday',
        focus: 'Low-impact cardio + core stability',
        durationMinutes: 35,
        intensity: 'low',
        warmup: ['5 min easy cycle or walk'],
        main: ['20 min low-impact cardio', 'Dead bug 3x8 each side', 'Bird dog 3x8 each side'],
        cooldown: ['5 min breathing and trunk mobility'],
        modifications: hasPain ? ['Avoid impact drills and prioritize stable surfaces.'] : [],
      },
      {
        day: 'Friday',
        focus: preferred === 'mobility-yoga' ? 'Mobility flow and controlled strength' : 'Strength progression',
        durationMinutes: 45,
        intensity: 'moderate',
        warmup: ['5 min light cardio', 'Dynamic mobility sequence'],
        main: ['Split squat 3x8', 'Hip hinge pattern 3x10', 'Push-pull superset 3 rounds'],
        cooldown: ['Hamstring and hip flexor stretch', 'Thoracic rotation mobility'],
        modifications: hasPain ? ['Swap painful movements for machine-based or supported alternatives.'] : [],
      },
    ],
    recoveryNotes: [
      'Aim for 7-9 hours of sleep and one full rest day between harder sessions.',
      'Hydrate and keep protein intake aligned with your macro target.',
    ],
    safetyNotes: [
      'Stop any movement that causes sharp or worsening pain.',
      'Progress load gradually week to week and keep 1-2 reps in reserve.',
    ],
    equipmentNotes: ['Dumbbells or resistance bands are enough for this baseline plan.'],
  };
}
