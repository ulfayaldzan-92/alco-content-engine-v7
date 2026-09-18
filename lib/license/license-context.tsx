'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AlcoLicensePayload, AlcoLicenseStoreState, AlcoVerificationResult } from './types';
import { getAlcoDeviceId, getCachedAlcoDeviceId } from './device-fingerprint';
import { verifyLicenseCode } from './verification';
import { generateRequestCodeV2 } from './request-code';

const LICENSE_STORAGE_KEY = 'alco_license_code_v2';
const LAST_STATE_KEY = 'alco_license_last_state_v2';

interface LicenseContextValue {
  state: AlcoLicenseStoreState;
  deviceId: string;
  isLoading: boolean;
  activateLicense: (rawCode: string) => Promise<AlcoVerificationResult>;
  deactivateLicense: () => void;
  reverifyLicense: () => Promise<AlcoVerificationResult>;
  generateRequestCode: (params: { name: string; email: string; notes?: string }) => string;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [state, setState] = useState<AlcoLicenseStoreState>({
    status: 'unlicensed',
    license: null,
    rawCode: null,
    deviceId: '',
    lastVerifiedAt: null,
  });

  // Load and verify license on startup
  const initLicense = useCallback(async () => {
    setIsLoading(true);
    try {
      const devId = await getAlcoDeviceId();
      setDeviceId(devId);

      let savedCode: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        savedCode = window.localStorage.getItem(LICENSE_STORAGE_KEY);
      }

      if (!savedCode) {
        setState({
          status: 'unlicensed',
          license: null,
          rawCode: null,
          deviceId: devId,
          lastVerifiedAt: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }

      // Re-verify stored license
      const result = await verifyLicenseCode(savedCode, devId);

      if (result.valid && result.license) {
        setState({
          status: 'active',
          license: result.license,
          rawCode: savedCode,
          deviceId: devId,
          lastVerifiedAt: new Date().toISOString(),
        });
      } else {
        setState({
          status: result.status === 'expired' ? 'expired' : 'invalid',
          license: result.license || null,
          rawCode: savedCode,
          deviceId: devId,
          lastVerifiedAt: new Date().toISOString(),
          error: result.error,
        });
      }
    } catch (err) {
      console.error('Failed to initialize license:', err);
      setState((prev) => ({
        ...prev,
        status: 'unlicensed',
        error: 'Gagal menginisialisasi verifikasi lisensi',
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Read cached device ID safely after client mount to prevent SSR hydration mismatch
    const cached = getCachedAlcoDeviceId();
    if (cached) {
      setDeviceId(cached);
    }
    initLicense();
  }, [initLicense]);

  const activateLicense = useCallback(
    async (rawCode: string): Promise<AlcoVerificationResult> => {
      setIsLoading(true);
      try {
        const currentDevId = deviceId || (await getAlcoDeviceId());
        const result = await verifyLicenseCode(rawCode, currentDevId);

        if (result.valid && result.license) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(LICENSE_STORAGE_KEY, rawCode.trim());
          }
          setState({
            status: 'active',
            license: result.license,
            rawCode: rawCode.trim(),
            deviceId: currentDevId,
            lastVerifiedAt: new Date().toISOString(),
          });
        } else {
          setState((prev) => ({
            ...prev,
            status: result.status === 'expired' ? 'expired' : 'invalid',
            error: result.error,
          }));
        }

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          valid: false,
          status: 'invalid_signature',
          error: `Gagal mengaktifkan lisensi: ${msg}`,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [deviceId]
  );

  const deactivateLicense = useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LICENSE_STORAGE_KEY);
      window.localStorage.removeItem(LAST_STATE_KEY);
    }
    setState({
      status: 'unlicensed',
      license: null,
      rawCode: null,
      deviceId,
      lastVerifiedAt: new Date().toISOString(),
    });
  }, [deviceId]);

  const reverifyLicense = useCallback(async (): Promise<AlcoVerificationResult> => {
    if (!state.rawCode) {
      return { valid: false, status: 'unlicensed', error: 'Belum ada lisensi terpasang' };
    }
    return activateLicense(state.rawCode);
  }, [state.rawCode, activateLicense]);

  const generateRequestCode = useCallback(
    (params: { name: string; email: string; notes?: string }): string => {
      return generateRequestCodeV2({
        name: params.name,
        email: params.email,
        notes: params.notes,
        deviceId,
      });
    },
    [deviceId]
  );

  const contextValue = useMemo<LicenseContextValue>(
    () => ({
      state,
      deviceId,
      isLoading,
      activateLicense,
      deactivateLicense,
      reverifyLicense,
      generateRequestCode,
    }),
    [state, deviceId, isLoading, activateLicense, deactivateLicense, reverifyLicense, generateRequestCode]
  );

  return <LicenseContext.Provider value={contextValue}>{children}</LicenseContext.Provider>;
};

export function useLicense(): LicenseContextValue {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
