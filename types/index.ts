export interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  weightLbs: number; // lbs - user input
  heightFeet: number; // feet - user input
  heightInches: number; // inches - user input
  activityLevel: ActivityLevel;
  goal: 'lose' | 'maintain' | 'gain';
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

export interface BloodMarkers {
  glucose?: number; // mg/dL (fasting)
  hba1c?: number; // %
  totalCholesterol?: number; // mg/dL
  ldl?: number; // mg/dL
  hdl?: number; // mg/dL
  triglycerides?: number; // mg/dL
  tsh?: number; // mIU/L
  vitaminD?: number; // ng/mL
  vitaminB12?: number; // pg/mL
  ferritin?: number; // ng/mL
  iron?: number; // mcg/dL
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

export interface AnalysisResult {
  tdee: TDEEResult;
  healthScore: HealthScore;
  insights: Insight[];
  deficiencies: string[];
  risks: string[];
}

export interface ParsedBloodReport {
  markers: BloodMarkers;
  confidence: number;
  rawText: string;
}
