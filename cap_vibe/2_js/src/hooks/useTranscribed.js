import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

const KEY = 'transcribed_trip_ids';

export function useTranscribed() {
  const [ids, setIds] = useState(new Set());

  const load = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: KEY });
      const list = value ? JSON.parse(value) : [];
      setIds(new Set(Array.isArray(list) ? list : []));
    } catch {
      setIds(new Set());
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async (tripId) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      Preferences.set({ key: KEY, value: JSON.stringify([...next]) }).catch(() => {});
      return next;
    });
  }, []);

  const isTranscribed = useCallback(
    (tripId) => ids.has(tripId),
    [ids],
  );

  return { isTranscribed, toggle };
}
