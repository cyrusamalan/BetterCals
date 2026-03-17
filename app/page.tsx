'use client';

import { useState } from 'react';
import { Heart, Activity, FileText } from 'lucide-react';
import TDEEForm from '@/components/TDEEForm';
import BloodReportUploader from '@/components/BloodReportUploader';
import BloodValuesForm from '@/components/BloodValuesForm';
import TDEEResultCard from '@/components/TDEEResultCard';
import HealthScoreCard from '@/components/HealthScoreCard';
import InsightsList from '@/components/InsightsList';
import BloodMarkersTable from '@/components/BloodMarkersTable';
import { 
  UserProfile, 
  BloodMarkers, 
  AnalysisResult
} from '@/types';
import { 
  calculateTDEE, 
  calculateHealthScore, 
  generateInsights,
  identifyDeficiencies,
  identifyRisks
} from '@/lib/calculations';
import { parseBloodReport } from '@/lib/bloodParser';

type Step = 'profile' | 'blood' | 'results';

export default function Home() {
  const [step, setStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [markers, setMarkers] = useState<BloodMarkers>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleProfileSubmit = (data: UserProfile) => {
    console.log('✅ Profile received in Home:', data);
    setProfile(data);
    setStep('blood');
  };

  const handleBloodTextExtracted = (text: string) => {
    const parsed = parseBloodReport(text);
    setMarkers(parsed);
  };

  const handleBloodSubmit = (data: BloodMarkers) => {
    const mergedMarkers = { ...markers, ...data };
    setMarkers(mergedMarkers);
    
    if (profile) {
      console.log('🧮 About to calculate TDEE with profile:', profile);
      const tdee = calculateTDEE(profile);
      console.log('📊 TDEE Result:', tdee);
      const healthScore = calculateHealthScore(mergedMarkers);
      const insights = generateInsights(profile, tdee, mergedMarkers);
      
      setResult({
        tdee,
        healthScore,
        insights,
        deficiencies: identifyDeficiencies(mergedMarkers),
        risks: identifyRisks(mergedMarkers),
      });
      
      setStep('results');
    }
  };

  const handleReset = () => {
    setStep('profile');
    setProfile(null);
    setMarkers({});
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blood-500 to-blood-600 p-2 rounded-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BloodWise</h1>
              <p className="text-sm text-gray-500">Smart Calorie & Health Calculator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <StepIndicator 
              step={1} 
              label="Profile" 
              icon={Activity}
              active={step === 'profile'} 
              completed={step !== 'profile'}
            />
            <div className="w-16 h-0.5 bg-gray-200">
              <div className={`h-full transition-all ${step !== 'profile' ? 'bg-primary-500' : 'bg-gray-200'}`} />
            </div>
            <StepIndicator 
              step={2} 
              label="Blood Report" 
              icon={FileText}
              active={step === 'blood'} 
              completed={step === 'results'}
            />
            <div className="w-16 h-0.5 bg-gray-200">
              <div className={`h-full transition-all ${step === 'results' ? 'bg-primary-500' : 'bg-gray-200'}`} />
            </div>
            <StepIndicator 
              step={3} 
              label="Results" 
              icon={Heart}
              active={step === 'results'} 
              completed={false}
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {step === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 1: Your Profile
              </h2>
              <p className="text-gray-600 mb-6">
                Let&apos;s calculate your daily calorie needs using the Mifflin-St Jeor equation.
              </p>
              <TDEEForm onSubmit={handleProfileSubmit} />
            </div>
          )}

          {step === 'blood' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Step 2: Blood Report Analysis
                </h2>
                <p className="text-gray-600 mb-4">
                  Upload your blood report for automatic extraction, or enter values manually below.
                </p>
                <BloodReportUploader onTextExtracted={handleBloodTextExtracted} />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Manual Entry
                </h3>
                <BloodValuesForm 
                  onSubmit={handleBloodSubmit} 
                  initialValues={markers}
                />
              </div>
            </div>
          )}

          {step === 'results' && result && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Your Results</h2>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  Start Over
                </button>
              </div>

              <TDEEResultCard result={result.tdee} />

              {Object.keys(markers).length > 0 && (
                <>
                  <HealthScoreCard score={result.healthScore} />
                  <BloodMarkersTable markers={markers} />
                  
                  {(result.deficiencies.length > 0 || result.risks.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.deficiencies.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-900 mb-2">Potential Deficiencies</h4>
                          <ul className="list-disc list-inside text-sm text-yellow-800">
                            {result.deficiencies.map((def) => (
                              <li key={def}>{def}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.risks.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-2">Health Risks</h4>
                          <ul className="list-disc list-inside text-sm text-red-800">
                            {result.risks.map((risk) => (
                              <li key={risk}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <InsightsList insights={result.insights} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            BloodWise provides estimates and insights for informational purposes only. 
            Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Step Indicator Component
interface StepIndicatorProps {
  step: number;
  label: string;
  icon: React.ElementType;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ step, label, icon: Icon, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center space-y-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          active
            ? 'bg-primary-600 text-white'
            : completed
            ? 'bg-primary-100 text-primary-600'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-center">
        <span className="text-xs text-gray-500">Step {step}</span>
        <p className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
          {label}
        </p>
      </div>
    </div>
  );
}
