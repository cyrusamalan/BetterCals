'use client';

import { useCallback, useState } from 'react';

export function useClipboardShare(sharePath: string) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin ? `${origin}${sharePath}` : sharePath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, [sharePath]);

  return { copied, handleShare };
}
