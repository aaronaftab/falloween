'use client';

import { useSyncExternalStore } from 'react';
import { fal } from '@fal-ai/client';

interface UseFalApiReturn {
  apiKey: string | null;
  hasApiKey: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

// Global state for API key
let globalApiKey: string | null = null;
let listeners: Set<() => void> = new Set();

// Initialize from localStorage (client-side only)
if (typeof window !== 'undefined') {
  const savedKey = localStorage.getItem('fal_api_key');
  if (savedKey) {
    globalApiKey = savedKey;
    fal.config({ credentials: savedKey });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return globalApiKey;
}

function getServerSnapshot() {
  return null;
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function useFalApi(): UseFalApiReturn {
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setApiKey = (key: string) => {
    const trimmedKey = key.trim();
    localStorage.setItem('fal_api_key', trimmedKey);
    globalApiKey = trimmedKey;
    fal.config({ credentials: trimmedKey });
    notifyListeners();
  };

  const clearApiKey = () => {
    localStorage.removeItem('fal_api_key');
    globalApiKey = null;
    fal.config({ credentials: '' });
    notifyListeners();
  };

  return {
    apiKey,
    hasApiKey: !!apiKey,
    setApiKey,
    clearApiKey,
  };
}

