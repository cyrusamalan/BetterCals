export interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  weightLbs: number; // lbs - user input
  heightFeet: number; // feet - user input
  heightInches: number; // inches - user input
  activityLevel: ActivityLevel;
  goal: 'lose' | 'maintain' | 'gain';
  smoker?: boolean;
  diabetic?: boolean;
  bloodPressureSystolic?: number;
  treatedForHypertension?: boolean;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

export interface BloodMarkers {
  glucose?: number; // mg/dL (fasting)
  hba1c?: number; // %
  totalCholesterol?: number; // mg/dL
  nonHdl?: number; // mg/dL (Total Cholesterol - HDL)
  ldl?: number; // mg/dL
  hdl?: number; // mg/dL
  triglycerides?: number; // mg/dL
  apoB?: number; // mg/dL
  hsCRP?: number; // mg/L (high-sensitivity C-reactive protein)
  tsh?: number; // mIU/L
  vitaminD?: number; // ng/mL
  vitaminB12?: number; // pg/mL
  ferritin?: number; // ng/mL
  iron?: number; // mcg/dL
}

export type MarkerStatus =
  | 'low'
  | 'optimal'
  | 'normal'
  | 'borderline'
  | 'high'
  | 'critical';

export interface MarkerRangeTier {
  min: number;
  max: number;
  status: MarkerStatus;
  score: number; // 0-100
  label: string;
}

export interface MarkerDefinition {
  unit: string;
  universal?: MarkerRangeTier[];
  male?: MarkerRangeTier[];
  female?: MarkerRangeTier[];
}

export interface MarkerInterpretation {
  status: MarkerStatus;
  label: string;
  score: number;
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  activityMultiplier: number;
}

export interface HealthScore {
  overall: number;
  metabolic: number;
  cardiovascular: number;
  hormonal: number;
  nutritional: number;
}

export interface Insight {
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description: string;
  recommendation?: string;
}

export interface CalorieTier {
  label: string;
  weeklyChange: string;
  dailyCalories: number;
  dailyDeficit: number;
}

export interface MacroBreakdown {
  protein: { grams: number; pct: number };
  carbs: { grams: number; pct: number };
  fat: { grams: number; pct: number };
  calories: number;
}

export interface SupplementRec {
  name: string;
  dosage: string;
  reason: string;
}

export interface PersonalizedRecs {
  bmi: number;
  bmiCategory: string;
  waterIntakeOz: number;
  ldlHdlRatio: number | null;
  ldlHdlInterpretation: string | null;
  supplements: SupplementRec[];
  exerciseSuggestions: string[];
}

export interface AnalysisResult {
  tdee: TDEEResult;
  healthScore: HealthScore;
  insights: Insight[];
  deficiencies: string[];
  risks: string[];
  calorieTiers: CalorieTier[];
  macros: MacroBreakdown;
  recommendations: PersonalizedRecs;
  ascvdRiskScore?: number;
  usedAverageMarkers?: boolean;
}

export interface ParsedBloodReport {
  markers: BloodMarkers;
  confidence: number;
  rawText: string;
}
