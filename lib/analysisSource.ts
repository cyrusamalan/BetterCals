import type { AnalysisSource, BloodMarkers } from '@/types';

export function getCorrectedMarkers(
  extracted: BloodMarkers,
  submitted: BloodMarkers,
): (keyof BloodMarkers)[] {
  const keys = new Set<keyof BloodMarkers>([
    ...(Object.keys(extracted) as (keyof BloodMarkers)[]),
    ...(Object.keys(submitted) as (keyof BloodMarkers)[]),
  ]);

  return [...keys].filter((key) => extracted[key] !== submitted[key]);
}

export function getAnalysisSourceLabel(source?: AnalysisSource): string {
  if (!source) return 'Manual entry';
  if (source.mode === 'average') return 'Population averages';
  if (source.mode === 'upload') return source.fileName ? `Uploaded report: ${source.fileName}` : 'Uploaded report';
  return 'Manual entry';
}

export function getAnalysisSourceBadge(source?: AnalysisSource): string {
  if (!source) return 'Manual';
  if (source.mode === 'average') return 'Averages';
  if (source.mode === 'upload') return 'Upload';
  return 'Manual';
}
