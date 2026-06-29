import type { CenterNeed, CenterWithStats } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mock/data";

const STORAGE_KEYS = {
  centers: "ve-ayuda:centers",
  needs: "ve-ayuda:needs",
  cachedAt: "ve-ayuda:cached-at",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveCentersCache(centers: CenterWithStats[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.centers, JSON.stringify(centers));
    localStorage.setItem(STORAGE_KEYS.cachedAt, new Date().toISOString());
  } catch {
    // QuotaExceeded o modo privado
  }
}

export function getCentersCache(): CenterWithStats[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.centers);
    return raw ? (JSON.parse(raw) as CenterWithStats[]) : null;
  } catch {
    return null;
  }
}

export function getCacheTimestamp(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.cachedAt);
}

export function saveNeedsCache(centerId: string, needs: CenterNeed[]) {
  if (!isBrowser()) return;
  try {
    const all = getAllNeedsCache();
    all[centerId] = needs;
    localStorage.setItem(STORAGE_KEYS.needs, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function getNeedsCache(centerId: string): CenterNeed[] | null {
  if (!isBrowser()) return null;
  const all = getAllNeedsCache();
  return all[centerId] ?? null;
}

function getAllNeedsCache(): Record<string, CenterNeed[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.needs);
    return raw ? (JSON.parse(raw) as Record<string, CenterNeed[]>) : {};
  } catch {
    return {};
  }
}

export function filterCentersOffline(
  centers: CenterWithStats[],
  options: { city?: string; needSlug?: string; status?: CenterWithStats["status"] },
  needsByCenter?: Record<string, CenterNeed[]>
): CenterWithStats[] {
  let results = [...centers];

  if (options.city) {
    const q = options.city.toLowerCase();
    results = results.filter((c) => c.city.toLowerCase().includes(q));
  }

  if (options.status) {
    results = results.filter((c) => c.status === options.status);
  }

  if (options.needSlug && needsByCenter) {
    const centerIds = new Set<string>();
    for (const [centerId, needs] of Object.entries(needsByCenter)) {
      const hasMatch = needs.some((n) => {
        const cat = MOCK_CATEGORIES.find((c) => c.id === n.category_id);
        return cat?.slug === options.needSlug && n.priority !== "covered";
      });
      if (hasMatch) centerIds.add(centerId);
    }
    results = results.filter((c) => centerIds.has(c.id));
  }

  return results.sort(
    (a, b) => b.urgent_needs_count - a.urgent_needs_count
  );
}
