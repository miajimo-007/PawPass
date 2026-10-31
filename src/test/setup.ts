import 'fake-indexeddb/auto';
import { afterAll, beforeEach } from 'vitest';
import { db } from '@/db/database';

// Every test starts with an empty database, exactly like a fresh install.
beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(() => db.close());
