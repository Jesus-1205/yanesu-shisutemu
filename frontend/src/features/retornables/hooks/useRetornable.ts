import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type {
  RetornableResumenOut,
  RetornableReportePaginationOut,
  RetornableReporteCompletoOut,
  RetornableMovimientoPaginationOut,
  RetornableProductoOut,
} from "@/types/api";

export function useRetornableResumen() {
  const [data, setData] = useState<RetornableResumenOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRetornableResumen();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useRetornableReportes(page = 1, pageSize = 20) {
  const [data, setData] = useState<RetornableReportePaginationOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRetornableReportes(page, pageSize);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useRetornableDetalleReporte(id: number | null) {
  const [data, setData] = useState<RetornableReporteCompletoOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRetornableDetalleReporte(id);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useRetornableHistorico(
  page = 1,
  pageSize = 20,
  filters?: {
    presentacion?: string;
    tipo_movimiento?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  },
) {
  const [data, setData] = useState<RetornableMovimientoPaginationOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRetornableHistorico(page, pageSize, filters);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters?.presentacion, filters?.tipo_movimiento, filters?.fecha_desde, filters?.fecha_hasta]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useRetornableProductos() {
  const [data, setData] = useState<RetornableProductoOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRetornableProductos();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
