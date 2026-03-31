export interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  race?: 'white' | 'black' | 'other';
  weightLbs: number; // lbs - user input
  heightFeet: number; // feet - user input
  heightInches: number; // inches - user input
  activityLevel: ActivityLevel;
  goal: 'lose-aggressive' | 'lose-moderate' | 'lose-mild' | 'maintain' | 'gain-lean' | 'gain-aggressive';
  smoker?: boolean;
  diabetic?: boolean;
  bloodPressureSystolic?: number;
  treatedForHypertension?: boolean;
  waistInches?: number;
  hipInches?: number;
  bodyFatPercentage?: number; // optional; enables Katch-McArdle TDEE
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
  alt?: number; // U/L (alanine aminotransferase)
  ast?: number; // U/L (aspartate aminotransferase)
  albumin?: number; // g/dL
  creatinine?: number; // mg/dL
  uricAcid?: number; // mg/dL
  fastingInsulin?: number; // mIU/L
}

export type MarkerStatus =
  | 'low'
  | 'optimal'
  | 'normal'
  | 'borderline'
  | 'high'
  | 'critical'
  | 'unknown';

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
  hepatic: number;
  renal: number;
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
  /** Daily calorie change from TDEE (negative = deficit, positive = surplus) */
  dailyChange: number;
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

export interface MealTimingSuggestion {
  meal: string;
  time: string;
  calories: number;
  focus: string;
}

export interface PersonalizedRecs {
  bmi: number;
  bmiCategory: string;
  waterIntakeOz: number;
  ldlHdlRatio: number | null;
  ldlHdlInterpretation: string | null;
  tgHdlRatio: number | null;
  tgHdlInterpretation: string | null;
  waistToHipRatio: number | null;
  waistToHipInterpretation: string | null;
  homaIR: number | null;
  homaIRInterpretation: string | null;
  tyg: number | null;
  tygInterpretation: string | null;
  supplements: SupplementRec[];
  exerciseSuggestions: string[];
  mealTiming: MealTimingSuggestion[];
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
  derivedMarkers?: { ldl?: number; nonHdl?: number };
  ascvdRiskScore?: number;
  ascvdRiskReason?: string;
  usedAverageMarkers?: boolean;
}

export interface ParsedBloodReport {
  markers: BloodMarkers;
  confidence: number;
  rawText: string;
}

export interface AnalysisHistory {
  id: number;
  createdAt: string;
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
}

export interface FoodSensitivityFlag {
  title: string;
  markers: string;
  suggestion: string;
  severity: 'info' | 'warning';
}
