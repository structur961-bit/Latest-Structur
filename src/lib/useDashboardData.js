import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keep failures visible and discard responses from an older business/request.
 * @template T
 * @param {string | undefined} businessId
 * @param {T} initialData
 * @param {() => Promise<T>} query
 */
export function useDashboardData(businessId, initialData, query) {
  const queryRef = useRef(query);
  const initialRef = useRef(initialData);
  const generation = useRef(0);
  queryRef.current = query;
  const [state, setState] = useState({ scope: businessId, data: initialData, loading: !!businessId, error: '' });

  const refresh = useCallback(async () => {
    if (!businessId) return;
    const request = ++generation.current;
    setState(previous => ({ scope: businessId, data: previous.scope === businessId ? previous.data : initialRef.current, loading: true, error: '' }));
    try {
      const data = await queryRef.current();
      if (generation.current === request) setState({ scope: businessId, data, loading: false, error: '' });
    } catch (error) {
      if (generation.current === request) setState({ scope: businessId, data: initialRef.current, loading: false, error: error.message || 'Could not load restaurant data.' });
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
    return () => { generation.current++; };
  }, [refresh]);

  return { ...(state.scope === businessId ? state : { data: initialRef.current, loading: !!businessId, error: '' }), refresh };
}
