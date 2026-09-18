export type AlcoPlan = 'starter' | 'pro' | 'enterprise' | 'custom';
export type AlcoLicenseType = 'lifetime' | 'subscription';

export interface AlcoRequestCodePayload {
  v: '2.0';
  app: 'alco-content-engine' | string;
  dev: string; // ALCO-DEV-XXXX-XXXX-XXXX
  email: string;
  name: string;
  req: string;
  ts: string;
  notes?: string;
}

export interface AlcoLicensePayload {
  licenseVersion: '1.0';
  licenseId: string;
  appId: 'alco-content-engine' | string;
  deviceId: string;
  customerId: string;
  customerName?: string;
  plan: AlcoPlan;
  licenseType: AlcoLicenseType;
  features: string[];
  issuedAt: string;
  expiresAt: string | null;
  metadata?: Record<string, unknown>;
}

export interface AlcoVerificationResult {
  valid: boolean;
  status: 'active' | 'expired' | 'device_mismatch' | 'app_mismatch' | 'invalid_signature' | 'malformed' | 'unlicensed';
  error?: string;
  license?: AlcoLicensePayload;
  deviceId?: string;
}

export interface AlcoLicenseStoreState {
  status: 'active' | 'unlicensed' | 'expired' | 'invalid';
  license: AlcoLicensePayload | null;
  rawCode: string | null;
  deviceId: string;
  lastVerifiedAt: string | null;
  error?: string;
}
