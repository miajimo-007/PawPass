export interface StorageInfo {
  supported: boolean;
  usage?: number;
  quota?: number;
  ratio?: number;
  persisted?: boolean;
  level: 'ok' | 'warning' | 'critical' | 'unknown';
}

export const WARNING_RATIO = 0.8;
export const CRITICAL_RATIO = 0.95;

export async function getStorageInfo(): Promise<StorageInfo> {
  const sm = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!sm?.estimate) return { supported: false, level: 'unknown' };
  try {
    const { usage = 0, quota = 0 } = await sm.estimate();
    const persisted = sm.persisted ? await sm.persisted() : undefined;
    const ratio = quota > 0 ? usage / quota : undefined;
    const level = ratio === undefined ? 'unknown' : ratio >= CRITICAL_RATIO ? 'critical' : ratio >= WARNING_RATIO ? 'warning' : 'ok';
    return { supported: true, usage, quota, ratio, persisted, level };
  } catch {
    return { supported: false, level: 'unknown' };
  }
}

/**
 * Asks the browser to keep PAWPASS data even under storage pressure.
 * Browsers decide whether to grant this (installed PWAs are more likely to be granted).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
