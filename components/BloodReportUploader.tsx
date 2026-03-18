'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, Info } from 'lucide-react';

interface BloodReportUploaderProps {
  onTextExtracted: (text: string) => void;
}

export default function BloodReportUploader({ onTextExtracted }: BloodReportUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setDone(false);
    setFileName(file.name);

    try {
      const text = await simulateOCR();
      onTextExtracted(text);
      setDone(true);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again or enter values manually.');
    } finally {
      setIsProcessing(false);
    }
  }, [onTextExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  async function simulateOCR(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`
          BLOOD TEST RESULTS
          Glucose: 95 mg/dL
          HbA1c: 5.4%
          Total Cholesterol: 185 mg/dL
          LDL: 110 mg/dL
          HDL: 55 mg/dL
          Triglycerides: 120 mg/dL
          TSH: 2.5 mIU/L
          Vitamin D: 25 ng/mL
          Vitamin B12: 450 pg/mL
          Ferritin: 45 ng/mL
          Iron: 80 mcg/dL
        `);
      }, 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? '' : !fileName ? 'dropzone-idle' : ''}
        `}
        style={{
          borderColor: isDragActive
            ? 'var(--accent)'
            : done
            ? 'var(--status-normal-border)'
            : 'var(--border)',
          backgroundColor: isDragActive
            ? 'var(--accent-subtle)'
            : done
            ? 'var(--status-normal-bg)'
            : 'var(--bg-warm)',
        }}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
            >
              <Loader2
                className="w-7 h-7 animate-spin"
                style={{ color: 'var(--accent)' }}
              />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Processing {fileName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Extracting blood marker values...
              </p>
            </div>
          </div>
        ) : done && fileName ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center anim-scale-in"
              style={{ backgroundColor: 'var(--status-normal-bg)' }}
            >
              <CheckCircle
                className="w-7 h-7"
                style={{ color: 'var(--status-normal)' }}
              />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {fileName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--status-normal)' }}>
                Values extracted successfully
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Drop another file to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--border-light)' }}
            >
              <Upload className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {isDragActive ? 'Drop your blood report here' : 'Drag & drop your blood report'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                PDF, PNG, or JPG
              </p>
            </div>
            <button
              type="button"
              className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold btn-press"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                boxShadow: '0 2px 6px rgba(107, 143, 113, 0.2)',
              }}
            >
              Select File
            </button>
          </div>
        )}
      </div>

      {/* Demo notice */}
      <div
        className="flex items-start gap-2.5 rounded-lg p-3"
        style={{
          backgroundColor: 'var(--status-info-bg)',
          border: '1px solid var(--status-info-border)',
        }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--status-info)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold">Demo Mode</span> — The uploader simulates OCR extraction.
          In production, this would use Tesseract.js or a cloud API for medical document parsing.
        </p>
      </div>
    </div>
  );
}
