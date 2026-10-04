import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { Category } from "../types";

const PAGE_SIZE = 20;

export function useCategoriesList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchCategories = useCallback(async (q = "", pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCategoriesPaginated({
        page: pageNum,
        page_size: PAGE_SIZE,
        ...(q ? { search: q } : {}),
      });
      setCategories(res.items);
      setTotalPages(res.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    fetchCategories(debouncedSearch, page);
  }, [fetchCategories, debouncedSearch, page]);

  const refetch = useCallback(() => {
    fetchCategories(debouncedSearch, page);
  }, [fetchCategories, debouncedSearch, page]);

  return {
    categories,
    loading,
    error,
    page,
    totalPages,
    search,
    setSearch,
    setPage,
    refetch,
  };
}
