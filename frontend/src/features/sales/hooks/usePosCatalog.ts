import { usePosSearch } from "./usePosSearch";
import { usePosCombos } from "./usePosCombos";
import { usePosProducts } from "./usePosProducts";

export function usePosCatalog() {
  const {
    search,
    setSearch,
    debouncedSearch,
    searchRef,
    handleSearchChange,
    resetSearch,
  } = usePosSearch();

  const {
    loadingProducts,
    hideNoStock,
    setHideNoStock,
    filteredProducts,
    hasMoreFavorites,
    totalFavorites,
    handleShowMore,
  } = usePosProducts(debouncedSearch);

  const {
    showPromos,
    setShowPromos,
    combos,
    customizingCombo,
    setCustomizingCombo,
  } = usePosCombos();

  return {
    search,
    setSearch,
    debouncedSearch,
    loadingProducts,
    hideNoStock,
    setHideNoStock,
    showPromos,
    setShowPromos,
    combos,
    customizingCombo,
    setCustomizingCombo,
    searchRef,
    filteredProducts,
    hasMoreFavorites,
    totalFavorites,
    handleShowMore,
    handleSearchChange,
    resetSearch,
  };
}
