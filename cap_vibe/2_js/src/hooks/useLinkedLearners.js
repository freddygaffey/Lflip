import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api/index.js';

export function useLinkedLearners() {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await apiService.getLinkedLearners?.()) ?? [];
      setLearners(Array.isArray(list) ? list : []);
    } catch {
      setLearners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { learners, loading, refresh };
}
