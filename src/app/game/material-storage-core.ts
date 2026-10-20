import {
  getMaterialIdByName,
  getMaterialReferenceById,
  type MaterialCategory,
  type MaterialReference
} from './game-core.ts';

export interface MaterialStorageInventoryEntry {
  materialId?: number | null;
  category?: string;
  qty?: number | null;
  [key: string]: unknown;
}

export type MaterialStorageInventory = Record<string, MaterialStorageInventoryEntry | undefined>;
export type MaterialQuantityRequirements = Readonly<Record<number, number>>;

export interface ResolvedMaterialStorageEntry {
  storageKey: string;
  materialId: number;
  displayName: string;
  category: MaterialCategory;
  qty: number;
  entry: MaterialStorageInventoryEntry;
}

function resolveMaterialReference(
  storageKey: string,
  entry: MaterialStorageInventoryEntry
): MaterialReference | null {
  const referenceById = getMaterialReferenceById(entry.materialId);
  const legacyMaterialId = getMaterialIdByName(storageKey);

  if (referenceById && legacyMaterialId !== null && legacyMaterialId !== referenceById.materialId) {
    throw new Error(
      `Widersprüchliche Materialreferenz im Lager: Schlüssel ${storageKey} verweist auf ID ${legacyMaterialId}, Eintrag auf ID ${referenceById.materialId}.`
    );
  }

  if (referenceById) return referenceById;
  return getMaterialReferenceById(legacyMaterialId);
}

function resolvedEntry(
  storageKey: string,
  entry: MaterialStorageInventoryEntry,
  reference: MaterialReference
): ResolvedMaterialStorageEntry {
  return {
    storageKey,
    materialId: reference.materialId,
    displayName: reference.displayName,
    category: reference.definition.category,
    qty: Math.max(0, Number(entry.qty) || 0),
    entry
  };
}

/** Ergänzt bekannte Legacy-Lagereinträge um ihre stabile Material-ID. */
export function normalizeMaterialInventory(inventory: MaterialStorageInventory): number {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return 0;

  let changedEntries = 0;
  for (const [storageKey, entry] of Object.entries(inventory)) {
    if (!entry || typeof entry !== 'object') continue;
    const reference = resolveMaterialReference(storageKey, entry);
    if (!reference) continue;

    let changed = false;
    if (entry.materialId !== reference.materialId) {
      entry.materialId = reference.materialId;
      changed = true;
    }
    if (entry.category !== reference.definition.category) {
      entry.category = reference.definition.category;
      changed = true;
    }
    if (changed) changedEntries += 1;
  }

  return changedEntries;
}

export function getMaterialStorageEntries(inventory: MaterialStorageInventory): ResolvedMaterialStorageEntry[] {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return [];

  const result: ResolvedMaterialStorageEntry[] = [];
  for (const [storageKey, entry] of Object.entries(inventory)) {
    if (!entry || typeof entry !== 'object') continue;
    const reference = resolveMaterialReference(storageKey, entry);
    if (!reference) continue;
    result.push(resolvedEntry(storageKey, entry, reference));
  }
  return result;
}

export function getMaterialStorageEntryById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined
): ResolvedMaterialStorageEntry | null {
  const reference = getMaterialReferenceById(materialId);
  if (!reference) return null;

  const canonicalEntry = inventory[reference.displayName];
  if (canonicalEntry) {
    const canonicalReference = resolveMaterialReference(reference.displayName, canonicalEntry);
    if (canonicalReference?.materialId === reference.materialId) {
      return resolvedEntry(reference.displayName, canonicalEntry, canonicalReference);
    }
  }

  for (const [storageKey, entry] of Object.entries(inventory)) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = resolveMaterialReference(storageKey, entry);
    if (candidate?.materialId === reference.materialId) return resolvedEntry(storageKey, entry, candidate);
  }

  return null;
}

export function getMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined
): number {
  return getMaterialStorageEntryById(inventory, materialId)?.qty ?? 0;
}

export function addMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined,
  quantity: number
): ResolvedMaterialStorageEntry | null {
  const reference = getMaterialReferenceById(materialId);
  const amount = Number(quantity);
  if (!reference || !Number.isFinite(amount) || amount <= 0) return null;

  let existing = getMaterialStorageEntryById(inventory, reference.materialId);
  if (!existing) {
    const entry: MaterialStorageInventoryEntry = {
      materialId: reference.materialId,
      category: reference.definition.category,
      qty: 0
    };
    inventory[reference.displayName] = entry;
    existing = resolvedEntry(reference.displayName, entry, reference);
  }

  existing.entry.materialId = reference.materialId;
  existing.entry.category = reference.definition.category;
  existing.entry.qty = (Number(existing.entry.qty) || 0) + amount;
  return resolvedEntry(existing.storageKey, existing.entry, reference);
}

export function takeMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined,
  quantity: number
): boolean {
  const amount = Number(quantity);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const existing = getMaterialStorageEntryById(inventory, materialId);
  if (!existing || existing.qty < amount) return false;

  const remaining = existing.qty - amount;
  if (remaining > 0) {
    existing.entry.qty = remaining;
    existing.entry.materialId = existing.materialId;
    existing.entry.category = existing.category;
  } else {
    delete inventory[existing.storageKey];
  }
  return true;
}

/** Prüft zuerst alle Mengen und zieht sie anschließend atomar per Material-ID ab. */
export function reserveMaterialQuantitiesById(
  inventory: MaterialStorageInventory,
  requirements: MaterialQuantityRequirements
): boolean {
  const normalized = Object.entries(requirements)
    .map(([rawId, rawQuantity]) => ({ materialId: Number(rawId), quantity: Number(rawQuantity) }))
    .filter(requirement => Number.isFinite(requirement.quantity) && requirement.quantity > 0);

  if (normalized.some(requirement => !getMaterialReferenceById(requirement.materialId))) return false;
  if (normalized.some(requirement => getMaterialQuantityById(inventory, requirement.materialId) < requirement.quantity)) {
    return false;
  }

  for (const requirement of normalized) {
    if (!takeMaterialQuantityById(inventory, requirement.materialId, requirement.quantity)) {
      throw new Error(`Materialbestand änderte sich während einer synchronen Reservierung: ID ${requirement.materialId}.`);
    }
  }
  return true;
}
