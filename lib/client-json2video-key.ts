'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = [
  'alco_custom_json2video_api_key',
  'alco_json2video_api_key',
  'json2video_api_key',
];
const PRIMARY_KEY = 'alco_custom_json2video_api_key';
const EVENT_NAME = 'alco-json2video-key-updated';

/**
 * Get stored JSON2Video API Key from localStorage (client-side only)
 */
export function getStoredJson2VideoApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    for (const key of STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val && val.trim()) {
        return val.trim();
      }
    }
  } catch (e) {
    console.warn('Failed to read JSON2Video API key from localStorage:', e);
  }
  return '';
}

/**
 * Save JSON2Video API Key to localStorage and dispatch update event
 */
export function setStoredJson2VideoApiKey(key: string): void {
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
    console.error('Failed to save JSON2Video API key:', e);
  }
}

/**
 * Clear stored JSON2Video API Key
 */
export function removeStoredJson2VideoApiKey(): void {
  setStoredJson2VideoApiKey('');
}

/**
 * Builds request headers object with automatic injection of 'x-json2video-api-key'
 * if a custom personal JSON2Video API key is configured.
 */
export function buildJson2VideoRequestHeaders(
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

  const clientKey = getStoredJson2VideoApiKey();
  if (clientKey) {
    headers['x-json2video-api-key'] = clientKey;
  }

  return headers;
}

/**
 * Subscribe to API key updates from any component/tab
 */
export function subscribeToJson2VideoKeyChange(callback: (key: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ key: string }>;
    callback(customEvent.detail?.key ?? getStoredJson2VideoApiKey());
  };

  const storageHandler = (e: StorageEvent) => {
    if (STORAGE_KEYS.includes(e.key || '')) {
      callback(getStoredJson2VideoApiKey());
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
 * React Hook for reading and mutating the client-stored JSON2Video API key
 */
export function useJson2VideoApiKey() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const current = getStoredJson2VideoApiKey();
    setApiKey(current);
    setIsLoaded(true);

    const unsubscribe = subscribeToJson2VideoKeyChange((newKey) => {
      setApiKey(newKey);
    });

    return unsubscribe;
  }, []);

  const saveKey = useCallback((newKey: string) => {
    setStoredJson2VideoApiKey(newKey);
    setApiKey((newKey || '').trim());
  }, []);

  const clearKey = useCallback(() => {
    removeStoredJson2VideoApiKey();
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
