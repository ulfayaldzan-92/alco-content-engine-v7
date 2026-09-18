export function trackActivity(action: string, details?: string) {
  console.log(`[ACTIVITY TRACKER] ${action}: ${details || ''}`);
}
