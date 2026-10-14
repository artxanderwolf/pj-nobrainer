export interface ResourcePresentationInventoryEntryLike {
  qty: number;
}

export interface ResourceHeaderPresentation {
  goldText: string;
  materialCountText: string;
}

export type ResourceCurrencyFormatter = (value: number) => string;

function numeric(value: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function getResourceHeaderPresentation(
  gold: number,
  inventory: Record<string, ResourcePresentationInventoryEntryLike | null | undefined>,
  formatCurrency: ResourceCurrencyFormatter
): ResourceHeaderPresentation {
  const materialCount = Object.values(inventory ?? {}).reduce(
    (sum, entry) => sum + Math.max(0, numeric(entry?.qty ?? 0)),
    0
  );

  return {
    goldText: formatCurrency(numeric(gold)),
    materialCountText: String(materialCount)
  };
}

export const RESOURCE_PRESENTATION_CORE_BRIDGE = {
  getResourceHeaderPresentation
};

export type ResourcePresentationCoreBridge = typeof RESOURCE_PRESENTATION_CORE_BRIDGE;
