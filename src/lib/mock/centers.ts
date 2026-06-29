import type { CenterNeed, CenterWithStats, NeedCategory } from "@/types";
import {
  getAllCenters,
  getCategories,
  getCenterNeeds,
  initDemoStore,
} from "@/lib/store/demo-store";
import { MOCK_CATEGORIES } from "./data";

export interface MockCentersOptions {
  city?: string;
  status?: CenterWithStats["status"];
  needSlug?: string;
}

function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function filterCenters(
  centers: CenterWithStats[],
  needs: CenterNeed[],
  categories: NeedCategory[],
  options: MockCentersOptions
) {
  let results = [...centers].filter((c) => c.is_active);

  if (options.city) {
    const q = options.city.toLowerCase();
    results = results.filter((c) => c.city.toLowerCase().includes(q));
  }

  if (options.status) {
    results = results.filter((c) => c.status === options.status);
  }

  if (options.needSlug) {
    const centerIds = new Set(
      needs
        .filter((n) => {
          const cat = categories.find((c) => c.id === n.category_id);
          return cat?.slug === options.needSlug && n.priority !== "covered";
        })
        .map((n) => n.center_id)
    );
    results = results.filter((c) => centerIds.has(c.id));
  }

  return results.sort(
    (a, b) => b.urgent_needs_count - a.urgent_needs_count
  );
}

export async function getMockCenters(
  options: MockCentersOptions = {}
): Promise<CenterWithStats[]> {
  await delay();
  initDemoStore();
  const centers = getAllCenters();
  const needs = centers.flatMap((c) => getCenterNeeds(c.id));
  return filterCenters(centers, needs, getCategories(), options);
}

export async function getMockCenterNeeds(
  centerId: string
): Promise<CenterNeed[]> {
  await delay(50);
  initDemoStore();
  return getCenterNeeds(centerId);
}

export async function getMockCategories() {
  await delay(30);
  return MOCK_CATEGORIES;
}

export async function getMockCenterById(id: string) {
  await delay(50);
  initDemoStore();
  return getAllCenters().find((c) => c.id === id) ?? null;
}
