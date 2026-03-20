'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Tesseract from 'tesseract.js';
interface BloodReportUploaderProps {
  onTextExtracted: (text: string) => void;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allText: string[] = [];

  // First try native text extraction (works for digital/searchable PDFs)
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    allText.push(pageText);
  }

  const nativeText = allText.join('\n').trim();
  if (nativeText.length > 50) {
    return nativeText;
  }

  // Fallback: render pages to canvas and OCR them (for scanned PDFs)
  const ocrResults: string[] = [];
  const scale = 2;
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: () => {},
    });
    ocrResults.push(result.data.text);
  }

  return ocrResults.join('\n');
}

async function extractTextFromImage(file: File): Promise<string> {
  const result = await Tesseract.recognize(file, 'eng', {
    logger: () => {},
  });
  return result.data.text;
}

function getDropzoneBorderColor(isDragActive: boolean, done: boolean, error: string | null): string {
  if (isDragActive) return 'var(--accent)';
  if (done) return 'var(--status-normal-border)';
  if (error) return 'var(--status-danger)';
  return 'var(--border)';
}

function getDropzoneBackgroundColor(isDragActive: boolean, done: boolean, error: string | null): string {
  if (isDragActive) return 'var(--accent-subtle)';
  if (done) return 'var(--status-normal-bg)';
  if (error) return 'var(--status-danger-bg)';
  return 'var(--bg-warm)';
}

export default function BloodReportUploader({ onTextExtracted }: BloodReportUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setDone(false);
    setError(null);
    setFileName(file.name);

    try {
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const text = isPDF
        ? await extractTextFromPDF(file)
        : await extractTextFromImage(file);

      if (!text.trim()) {
        setError('Could not extract text from this file. Try entering values manually.');
        return;
      }

      onTextExtracted(text);
      setDone(true);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing file. Please try again or enter values manually.');
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
          borderColor: getDropzoneBorderColor(isDragActive, done, error),
          backgroundColor: getDropzoneBackgroundColor(isDragActive, done, error),
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
                Running OCR to extract blood marker values...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--status-danger-bg)' }}
            >
              <AlertTriangle
                className="w-7 h-7"
                style={{ color: 'var(--status-danger)' }}
              />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {fileName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--status-danger)' }}>
                {error}
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Drop another file to try again
            </p>
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
                PDF, PNG, or JPG — text is extracted using OCR
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
    </div>
  );
}
