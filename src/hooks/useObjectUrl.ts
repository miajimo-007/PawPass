import { useEffect, useState } from 'react';

/** Creates (and revokes) an object URL for a Blob stored in IndexedDB. */
export function useObjectUrl(blob?: Blob | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
