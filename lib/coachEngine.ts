import type {
  AnalysisResult,
  BloodMarkers,
  CoachMessage,
  CoachPlan,
  CoachPriority,
  CoachWeeklyAction,
  UserProfile,
} from '@/types';

function normalizeRiskLabel(risk: string): string {
  return risk.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildPriorities(result: AnalysisResult): CoachPriority[] {
  const fromActionPlan = (result.actionPlan ?? []).map((item) => ({
    title: item.title,
    reason: item.rationale,
    relatedMarkers: item.relatedMarkers,
  }));
  if (fromActionPlan.length > 0) return fromActionPlan.slice(0, 3);

  const fallback: CoachPriority[] = [];
  for (const risk of result.risks.slice(0, 2)) {
    fallback.push({
      title: `Reduce ${normalizeRiskLabel(risk).toLowerCase()}`,
      reason: 'This risk is already flagged in your deterministic analysis and is a high-value target for the next month.',
      relatedMarkers: [],
    });
  }
  if (result.deficiencies.length > 0 && fallback.length < 3) {
    fallback.push({
      title: `Correct ${result.deficiencies[0].toLowerCase()}`,
      reason: 'Addressing this deficiency usually improves energy, recovery, and adherence.',
      relatedMarkers: [],
    });
  }

  const padDistinct: CoachPriority[] = [
    {
      title: 'Hold calorie consistency',
      reason: 'Consistency is the fastest way to make the current targets measurable and actionable.',
      relatedMarkers: [],
    },
    {
      title: 'Keep routine stable',
      reason: 'Steady sleep, meals, and steps make week-to-week trends easier to interpret.',
      relatedMarkers: [],
    },
    {
      title: 'Change one lever at a time',
      reason: 'Pick a single focus (e.g. protein, alcohol, or daily steps) before stacking multiple changes.',
      relatedMarkers: [],
    },
  ];

  for (const item of padDistinct) {
    if (fallback.length >= 3) break;
    if (fallback.some((f) => f.title === item.title)) continue;
    fallback.push(item);
  }

  return fallback.slice(0, 3);
}

function buildWeeklyActions(result: AnalysisResult): CoachWeeklyAction[] {
  const actions: CoachWeeklyAction[] = [];
  const macros = result.macros;
  actions.push({
    title: 'Hit your calorie target daily',
    details: `Aim for ${Math.round(result.tdee.targetCalories)} kcal/day with protein ${Math.round(macros.protein.grams)}g, carbs ${Math.round(macros.carbs.grams)}g, fats ${Math.round(macros.fat.grams)}g.`,
  });

  const exerciseHint = result.recommendations.exerciseSuggestions?.[0];
  if (exerciseHint) {
    actions.push({
      title: 'Apply your training focus',
      details: exerciseHint,
    });
  }

  const supplementHint = result.recommendations.supplements?.[0];
  if (supplementHint) {
    actions.push({
      title: `Review ${supplementHint.name}`,
      details: `${supplementHint.dosage} — ${supplementHint.reason}`,
    });
  }

  if (actions.length < 3) {
    actions.push({
      title: 'Track adherence for 7 days',
      details: 'Log intake, steps/workouts, and sleep so your next iteration is based on measurable behavior.',
    });
  }

  return actions.slice(0, 4);
}

export function generateCoachPlan(result: AnalysisResult, profile: UserProfile, markers: BloodMarkers): CoachPlan {
  const priorities = buildPriorities(result);
  const weeklyActions = buildWeeklyActions(result);
  const markerCount = Object.keys(markers).length;
  const score = Math.round(result.healthScore.overall);

  return {
    summary: `Your current health score is ${score}/100. This plan focuses on your top ${priorities.length} priorities and week-one execution based on your profile and lab context.`,
    priorities,
    weeklyActions,
    whyItMatters: [
      `Your target calories are computed from your profile (${profile.goal.replace(/-/g, ' ')}) and activity assumptions, then personalized with marker context.`,
      markerCount > 0
        ? `We are using ${markerCount} marker values to prioritize actions with the highest metabolic payoff first.`
        : 'No explicit marker values were provided, so this plan is anchored to profile-driven targets and consistency.',
      'Improving adherence first makes the next round of lab interpretation more reliable and actionable.',
    ],
    guardrails: [
      'This coaching plan is educational and not a diagnosis.',
      'Do not change medications based on this app alone; discuss clinical decisions with your physician.',
      'When symptoms are severe or rapidly worsening, seek urgent medical care.',
    ],
  };
}

export function generateInitialCoachMessage(plan: CoachPlan): CoachMessage {
  const priorityLine = plan.priorities
    .slice(0, 3)
    .map((p, idx) => `${idx + 1}. ${p.title}`)
    .join('\n');
  const actionLine = plan.weeklyActions
    .slice(0, 2)
    .map((a) => `- ${a.title}: ${a.details}`)
    .join('\n');

  return {
    id: `coach-engine-${Date.now()}`,
    role: 'assistant',
    source: 'coach_engine',
    createdAt: new Date().toISOString(),
    text: `${plan.summary}\n\nTop priorities:\n${priorityLine}\n\nStart this week:\n${actionLine}`,
  };
}
