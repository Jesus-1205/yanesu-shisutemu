import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAnalyticsDataOptions {
  immediate?: boolean;
}

export function useAnalyticsData<T>(
  fetcher: () => Promise<T>,
  options: UseAnalyticsDataOptions = {},
) {
  const { immediate = true } = options;
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar datos";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { ...state, refetch: execute };
}