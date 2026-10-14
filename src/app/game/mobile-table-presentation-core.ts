export interface MobileTableLabelPresentation {
  labels: string[];
}

export function getMobileTableLabelPresentation(
  headers: readonly string[],
  cellCount: number
): MobileTableLabelPresentation {
  const normalizedCellCount = Number.isFinite(cellCount)
    ? Math.max(0, Math.floor(cellCount))
    : 0;

  return {
    labels: Array.from(
      { length: normalizedCellCount },
      (_, index) => (headers[index] ?? '').trim()
    )
  };
}

export const MOBILE_TABLE_PRESENTATION_CORE_BRIDGE = {
  getMobileTableLabelPresentation
};

export type MobileTablePresentationCoreBridge = typeof MOBILE_TABLE_PRESENTATION_CORE_BRIDGE;
