import type { BloodMarkers, UserProfile } from '@/types';

type AgeBand = 'u30' | '30_44' | '45_59' | '60p';
function getAgeBand(age: number): AgeBand {
  if (age < 30) return 'u30';
  if (age < 45) return '30_44';
  if (age < 60) return '45_59';
  return '60p';
}

export const POPULATION_MEDIANS: Record<UserProfile['gender'], Record<AgeBand, BloodMarkers>> = {
  male: {
    u30: {
      glucose: 90,
      hba1c: 5.2,
      totalCholesterol: 175,
      ldl: 105,
      hdl: 50,
      triglycerides: 105,
      tsh: 1.9,
      vitaminD: 28,
      vitaminB12: 460,
      ferritin: 100,
      iron: 100,
    },
    '30_44': {
      glucose: 92,
      hba1c: 5.3,
      totalCholesterol: 185,
      ldl: 115,
      hdl: 48,
      triglycerides: 120,
      tsh: 2.0,
      vitaminD: 27,
      vitaminB12: 440,
      ferritin: 110,
      iron: 95,
    },
    '45_59': {
      glucose: 95,
      hba1c: 5.4,
      totalCholesterol: 195,
      ldl: 125,
      hdl: 46,
      triglycerides: 135,
      tsh: 2.2,
      vitaminD: 26,
      vitaminB12: 420,
      ferritin: 120,
      iron: 90,
    },
    '60p': {
      glucose: 98,
      hba1c: 5.5,
      totalCholesterol: 200,
      ldl: 130,
      hdl: 45,
      triglycerides: 140,
      tsh: 2.4,
      vitaminD: 25,
      vitaminB12: 410,
      ferritin: 130,
      iron: 85,
    },
  },
  female: {
    u30: {
      glucose: 88,
      hba1c: 5.1,
      totalCholesterol: 170,
      ldl: 100,
      hdl: 58,
      triglycerides: 95,
      tsh: 2.2,
      vitaminD: 27,
      vitaminB12: 500,
      ferritin: 45,
      iron: 85,
    },
    '30_44': {
      glucose: 90,
      hba1c: 5.2,
      totalCholesterol: 180,
      ldl: 110,
      hdl: 56,
      triglycerides: 110,
      tsh: 2.4,
      vitaminD: 26,
      vitaminB12: 470,
      ferritin: 40,
      iron: 80,
    },
    '45_59': {
      glucose: 93,
      hba1c: 5.3,
      totalCholesterol: 195,
      ldl: 120,
      hdl: 54,
      triglycerides: 125,
      tsh: 2.6,
      vitaminD: 25,
      vitaminB12: 450,
      ferritin: 55,
      iron: 75,
    },
    '60p': {
      glucose: 96,
      hba1c: 5.4,
      totalCholesterol: 205,
      ldl: 125,
      hdl: 53,
      triglycerides: 130,
      tsh: 2.8,
      vitaminD: 24,
      vitaminB12: 440,
      ferritin: 70,
      iron: 70,
    },
  },
};

export function estimateAverageMarkers(profile: UserProfile): BloodMarkers {
  const ageBand = getAgeBand(profile.age);
  const fromTable = POPULATION_MEDIANS[profile.gender]?.[ageBand];
  if (fromTable) return { ...fromTable };

  // Safe fallback (kept conservative and non-extreme)
  const fallback: BloodMarkers = {
    glucose: 92,
    hba1c: 5.3,
    totalCholesterol: 185,
    ldl: 115,
    hdl: profile.gender === 'male' ? 48 : 56,
    triglycerides: 120,
    tsh: profile.gender === 'female' ? 2.4 : 2.0,
    vitaminD: 26,
    vitaminB12: 450,
    ferritin: profile.gender === 'female' ? 45 : 110,
    iron: profile.gender === 'female' ? 80 : 95,
  };

  return { ...fallback };
}

