'use client';

import { useCallback, useEffect, useState } from 'react';

export function useWealthStore<T extends { id: string }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/wealth/${endpoint}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : `Request failed (${response.status})`
        );
      }
      setItems(data as T[]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Wealth data.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object): Promise<boolean> => {
      setError(null);
      try {
        const response = await fetch(path, {
          method,
          ...(body ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          } : {}),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            typeof data.error === 'string' ? data.error : `Request failed (${response.status})`
          );
        }
        return await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save Wealth data.');
        return false;
      }
    },
    [refresh]
  );

  const create = useCallback(
    (item: Partial<T>) => mutate(`/api/wealth/${endpoint}`, 'POST', item),
    [endpoint, mutate]
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => mutate(`/api/wealth/${endpoint}/${id}`, 'PATCH', patch),
    [endpoint, mutate]
  );

  const remove = useCallback(
    (id: string) => mutate(`/api/wealth/${endpoint}/${id}`, 'DELETE'),
    [endpoint, mutate]
  );

  return { items, loading, error, create, update, remove, refresh };
}
