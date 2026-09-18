const DEVICE_ID_STORAGE_KEY = 'alco_device_id_v2';
const APP_NAMESPACE = 'alco:contentengine:device';

declare global {
  interface Window {
    alcoBridge?: {
      getDeviceId: () => Promise<string>;
      isElectron?: boolean;
      platform?: string;
    };
    electronAPI?: {
      getDeviceId: () => Promise<string>;
      isElectron?: boolean;
      platform?: string;
    };
  }
}

/**
 * Validates ALCO Device ID format: ALCO-DEV-XXXX-XXXX-XXXX
 */
export function isValidAlcoDeviceId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const regex = /^ALCO-DEV-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
  return regex.test(id.trim());
}

/**
 * Computes a SHA-256 hex string across browser and Node.
 */
async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(message).digest('hex');
  } catch {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = (hash << 5) - hash + message.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
}

/**
 * Generates or retrieves the stable ALCO Device ID for this machine.
 *
 * PRODUCTION ARCHITECTURE:
 * 1. Primary: Requests Device ID from Electron Main Process via secure IPC bridge (alcoBridge).
 *    Electron Main retrieves the Windows MachineGuid from the Windows Registry, hashes it into
 *    the standard ALCO format: ALCO-DEV-XXXX-XXXX-XXXX, and returns it.
 * 2. Fallback: If running in a web browser outside Electron (such as Google AI Studio dev preview),
 *    uses a deterministic development preview fallback.
 *
 * Browser data (userAgent, screen resolution, etc.) is NEVER used as primary production fingerprint.
 */
export async function getAlcoDeviceId(): Promise<string> {
  // 1. Primary Production Source: Electron IPC (Windows MachineGuid)
  if (typeof window !== 'undefined') {
    const bridge = window.alcoBridge || window.electronAPI;
    if (bridge && typeof bridge.getDeviceId === 'function') {
      try {
        const electronDeviceId = await bridge.getDeviceId();
        if (isValidAlcoDeviceId(electronDeviceId)) {
          // Synchronize to localStorage for fast synchronous cached reads on startup
          try {
            window.localStorage?.setItem(DEVICE_ID_STORAGE_KEY, electronDeviceId);
          } catch {
            // Ignore localStorage write error
          }
          return electronDeviceId;
        }
      } catch (err) {
        console.warn('[ALCO License] Failed to retrieve Device ID via Electron IPC:', err);
      }
    }
  }

  // 2. Fallback for Web/Development Preview Mode ONLY (Outside Electron)
  if (typeof window !== 'undefined') {
    // Check if development fallback ID was already established
    try {
      const cached = window.localStorage?.getItem(DEVICE_ID_STORAGE_KEY);
      if (cached && isValidAlcoDeviceId(cached)) {
        return cached;
      }
    } catch {
      // Ignore localStorage read errors
    }

    // Deterministic development preview seed (safe fallback for AI Studio web preview)
    const devHostname = window.location?.hostname || 'localhost';
    const devSeed = `${APP_NAMESPACE}::dev-preview::${devHostname}`;
    const hash = await sha256Hex(devSeed);
    const rawHex = hash.slice(0, 12).toUpperCase().padEnd(12, '0');
    const devFallbackId = `ALCO-DEV-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}-${rawHex.slice(8, 12)}`;

    try {
      window.localStorage?.setItem(DEVICE_ID_STORAGE_KEY, devFallbackId);
    } catch {
      // Ignore
    }
    return devFallbackId;
  }

  // 3. Node.js environment (e.g. server-side rendering or test scripts)
  const nodeSeed = `${APP_NAMESPACE}::node::${process.platform}::${process.arch}`;
  const hash = await sha256Hex(nodeSeed);
  const rawHex = hash.slice(0, 12).toUpperCase().padEnd(12, '0');
  return `ALCO-DEV-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}-${rawHex.slice(8, 12)}`;
}

/**
 * Synchronous version for initial rendering when localStorage cache is available.
 */
export function getCachedAlcoDeviceId(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (cached && isValidAlcoDeviceId(cached)) {
        return cached;
      }
    } catch {
      // Ignore
    }
  }
  return '';
}

