import { db } from '@/db/database';
import { stamp } from './base';

/** Remembers a clinic name for autocomplete. Never overwrites existing details with blanks. */
export async function rememberClinic(name?: string, details: { address?: string; phone?: string } = {}, isDemo?: boolean) {
  const n = name?.trim();
  if (!n) return;
  const existing = await db.clinics.where('name').equalsIgnoreCase(n).first();
  if (existing) {
    const patch: Record<string, string> = {};
    if (details.address && !existing.address) patch.address = details.address;
    if (details.phone && !existing.phone) patch.phone = details.phone;
    if (Object.keys(patch).length) await db.clinics.update(existing.id, { ...patch, updatedAt: new Date().toISOString() });
    return;
  }
  await db.clinics.add(stamp({ name: n, address: details.address, phone: details.phone }, { isDemo }));
}
