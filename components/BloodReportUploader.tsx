'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface BloodReportUploaderProps {
  onTextExtracted: (text: string) => void;
}

export default function BloodReportUploader({ onTextExtracted }: BloodReportUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await simulateOCR();
      onTextExtracted(text);
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
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
            <p className="text-gray-600">Processing your blood report... (simulated)</p>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center space-y-3">
            <FileText className="w-12 h-12 text-primary-600" />
            <p className="text-gray-700 font-medium">{fileName}</p>
            <p className="text-sm text-gray-500">Drop another file to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <Upload className="w-12 h-12 text-gray-400" />
            <p className="text-gray-700 font-medium">
              {isDragActive ? 'Drop your blood report here' : 'Drag & drop your blood report'}
            </p>
            <p className="text-sm text-gray-500">Supports PDF, PNG, JPG</p>
            <button
              type="button"
              className="mt-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Select File
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Demo Mode:</strong> The uploader simulates OCR extraction. 
          In production, this would use Tesseract.js for client-side OCR or connect to an API 
          for more accurate medical document parsing.
        </p>
      </div>
    </div>
  );
}
