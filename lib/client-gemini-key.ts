'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = [
  'alco_custom_gemini_api_key',
  'alco_gemini_api_key',
  'gemini_api_key',
];
const PRIMARY_KEY = 'alco_custom_gemini_api_key';
const EVENT_NAME = 'alco-gemini-key-updated';

/**
 * Get stored Gemini API Key from localStorage (client-side only)
 */
export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    for (const key of STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val && val.trim()) {
        return val.trim();
      }
    }
  } catch (e) {
    console.warn('Failed to read Gemini API key from localStorage:', e);
  }
  return '';
}

/**
 * Save Gemini API Key to localStorage and dispatch update event
 */
export function setStoredGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = (key || '').trim();
    if (trimmed) {
      localStorage.setItem(PRIMARY_KEY, trimmed);
    } else {
      for (const k of STORAGE_KEYS) {
        localStorage.removeItem(k);
      }
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key: trimmed } }));
  } catch (e) {
    console.error('Failed to save Gemini API key:', e);
  }
}

/**
 * Clear stored Gemini API Key
 */
export function removeStoredGeminiApiKey(): void {
  setStoredGeminiApiKey('');
}

/**
 * Builds request headers object with automatic injection of 'x-gemini-api-key'
 * if a custom personal Gemini API key is configured.
 */
export function buildGeminiRequestHeaders(
  additionalHeaders?: Record<string, string> | HeadersInit
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (additionalHeaders) {
    if (typeof Headers !== 'undefined' && additionalHeaders instanceof Headers) {
      additionalHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(additionalHeaders)) {
      additionalHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else if (typeof additionalHeaders === 'object') {
      Object.assign(headers, additionalHeaders);
    }
  }

  const clientKey = getStoredGeminiApiKey();
  if (clientKey) {
    headers['x-gemini-api-key'] = clientKey;
  }

  return headers;
}

/**
 * Subscribe to API key updates from any component/tab
 */
export function subscribeToGeminiKeyChange(callback: (key: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ key: string }>;
    callback(customEvent.detail?.key ?? getStoredGeminiApiKey());
  };

  const storageHandler = (e: StorageEvent) => {
    if (STORAGE_KEYS.includes(e.key || '')) {
      callback(getStoredGeminiApiKey());
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

/**
 * React Hook for reading and mutating the client-stored Gemini API key
 */
export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const current = getStoredGeminiApiKey();
    setApiKey(current);
    setIsLoaded(true);

    const unsubscribe = subscribeToGeminiKeyChange((newKey) => {
      setApiKey(newKey);
    });

    return unsubscribe;
  }, []);

  const saveKey = useCallback((newKey: string) => {
    setStoredGeminiApiKey(newKey);
    setApiKey((newKey || '').trim());
  }, []);

  const clearKey = useCallback(() => {
    removeStoredGeminiApiKey();
    setApiKey('');
  }, []);

  return {
    apiKey,
    hasCustomKey: Boolean(apiKey && apiKey.length > 0),
    isLoaded,
    saveKey,
    clearKey,
  };
}
