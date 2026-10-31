/** Errors surfaced to the UI with user-friendly messages. */
export class StorageFullError extends Error {
  constructor() {
    super(
      'Your browser has run out of storage space for PAWPASS. Nothing was changed. Free up space (for example, delete large documents) or export a backup.',
    );
    this.name = 'StorageFullError';
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} could not be found. It may have been deleted.`);
    this.name = 'NotFoundError';
  }
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; inner?: unknown; code?: number; message?: string };
  if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) return true;
  if (typeof e.message === 'string' && /quota/i.test(e.message)) return true;
  return e.inner ? isQuotaError(e.inner) : false;
}

/**
 * Runs a write operation. IndexedDB transactions are atomic, so when the
 * quota is exceeded the whole transaction is rolled back and previously
 * stored records are untouched. We translate the error into a clear message.
 */
export async function safeWrite<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isQuotaError(err)) throw new StorageFullError();
    throw err;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
