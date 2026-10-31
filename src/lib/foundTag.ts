/**
 * "Found me" collar tag. The tag's QR code contains a link whose #fragment holds
 * the details the owner chose to share. Fragments are never sent to the web
 * server, and nothing is uploaded anywhere: the information lives only in the QR code.
 */

export interface FoundTagData {
  /** Cat name */
  n: string;
  /** Phone number to call */
  p: string;
  /** Owner name (optional) */
  o?: string;
  /** Short message, e.g. "Indoor cat — I'm probably lost" */
  m?: string;
  /** Medical note, e.g. "Needs daily medication" */
  h?: string;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeFoundTag(data: FoundTagData): string {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === 'string' && v.trim())) as FoundTagData;
  return toBase64Url(JSON.stringify(clean));
}

export function decodeFoundTag(encoded: string | null | undefined): FoundTagData | null {
  if (!encoded) return null;
  try {
    const v = JSON.parse(fromBase64Url(encoded)) as Partial<FoundTagData>;
    if (typeof v.n !== 'string' || typeof v.p !== 'string') return null;
    const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : undefined);
    return { n: v.n.slice(0, 60), p: v.p.slice(0, 40), o: str(v.o, 60), m: str(v.m, 200), h: str(v.h, 200) };
  } catch {
    return null;
  }
}

/** Absolute link to the public "found me" page of this deployment. */
export function foundTagUrl(data: FoundTagData, base = typeof window !== 'undefined' ? window.location.origin + import.meta.env.BASE_URL : ''): string {
  return `${base}#/found?d=${encodeFoundTag(data)}`;
}
