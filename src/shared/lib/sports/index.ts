import { SPORT_CATALOG } from "./catalog";
import { SportDefinition, SportCategory } from "./types";

export * from "./types";
export * from "./catalog";
export * from "./customSportsService";
export * from "./sportMapping";

/**
 * Returns all available sports (catalog + optional custom sports)
 */
export function getAllSports(customSports: SportDefinition[] = []): SportDefinition[] {
  return [...SPORT_CATALOG, ...customSports];
}

/**
 * Find a sport by ID from catalog or custom list
 */
export function getSportById(
  id: string,
  customSports: SportDefinition[] = []
): SportDefinition | undefined {
  return (
    SPORT_CATALOG.find((s) => s.id === id) ||
    customSports.find((s) => s.id === id) ||
    SPORT_CATALOG.find((s) => s.nameHu.toLowerCase() === id.toLowerCase() || s.id.toLowerCase() === id.toLowerCase())
  );
}

/**
 * Filter sports by category
 */
export function getSportsByCategory(
  category: SportCategory,
  customSports: SportDefinition[] = []
): SportDefinition[] {
  return getAllSports(customSports).filter((s) => s.category === category);
}

/**
 * Search sports by text query across hu/en names and category
 */
export function searchSports(
  query: string,
  customSports: SportDefinition[] = []
): SportDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getAllSports(customSports);

  return getAllSports(customSports).filter((s) => {
    return (
      s.nameHu.toLowerCase().includes(normalized) ||
      s.nameEn.toLowerCase().includes(normalized) ||
      s.id.toLowerCase().includes(normalized)
    );
  });
}

/**
 * Common / recommended sports for top-level chips
 */
export function getCommonSports(customSports: SportDefinition[] = []): SportDefinition[] {
  return getAllSports(customSports).filter((s) => s.common);
}
