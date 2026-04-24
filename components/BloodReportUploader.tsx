'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import type { BloodMarkers } from '@/types';
import { announce } from '@/lib/announce';
interface BloodReportUploaderProps {
  onMarkersExtracted: (markers: BloodMarkers) => void;
}

async function extractMarkersServerSide(file: File): Promise<BloodMarkers> {
  const body = new FormData();
  body.append('file', file);

  const res = await fetch('/api/extract-blood-report', {
    method: 'POST',
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; details?: string[] };
    const detailText = Array.isArray(err?.details) && err.details.length > 0
      ? ` (${err.details.join(' | ')})`
      : '';
    throw new Error(`${err?.error || 'Extraction failed'}${detailText}`);
  }

  const data = await res.json() as { markers?: BloodMarkers };
  return data.markers ?? {};
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

export default function BloodReportUploader({ onMarkersExtracted }: BloodReportUploaderProps) {
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
      const markers = await extractMarkersServerSide(file);
      if (Object.keys(markers).length === 0) {
        const msg = 'No marker values found in this report. Try another report or enter values manually.';
        setError(msg);
        announce(msg);
        return;
      }

      onMarkersExtracted(markers);
      setDone(true);
      announce(`Successfully extracted ${Object.keys(markers).length} blood marker values.`);
    } catch (err) {
      console.error('Error processing file:', err);
      const msg = 'Error processing file. Please try again or enter values manually.';
      setError(msg);
      announce(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [onMarkersExtracted]);

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
        role="button"
        aria-label="Upload blood report file. Accepts PDF and image files."
        tabIndex={0}
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed p-8 text-center cursor-pointer
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
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
                Using AI to extract blood marker values...
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
                PDF - extracted with AI
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
