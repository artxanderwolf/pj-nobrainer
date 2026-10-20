import {
  getMaterialIdByName,
  getMaterialReferenceById,
  type MaterialCategory,
  type MaterialReference
} from './game-core.ts';

export interface MaterialStorageInventoryEntry {
  /** Redundante Selbstbeschreibung für Save-Diagnose; der kanonische Schlüssel ist die Material-ID. */
  materialId?: number | null;
  category?: string;
  qty?: number | null;
  [key: string]: unknown;
}

/**
 * JSON-Objektschlüssel sind Strings. Für bekannte Materialien ist ausschließlich
 * String(materialId) kanonisch; Namensschlüssel werden nur beim Laden alter Saves akzeptiert.
 */
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

export function getMaterialStorageKey(materialId: number | null | undefined): string | null {
  const reference = getMaterialReferenceById(materialId);
  return reference ? String(reference.materialId) : null;
}

function getMaterialReferenceByStorageKey(storageKey: string): MaterialReference | null {
  const numericKey = Number(storageKey);
  if (Number.isInteger(numericKey) && numericKey > 0) {
    const byId = getMaterialReferenceById(numericKey);
    if (byId) return byId;
  }

  return getMaterialReferenceById(getMaterialIdByName(storageKey));
}

function resolveMaterialReference(
  storageKey: string,
  entry: MaterialStorageInventoryEntry
): MaterialReference | null {
  const referenceByEntry = getMaterialReferenceById(entry.materialId);
  const referenceByKey = getMaterialReferenceByStorageKey(storageKey);

  if (referenceByEntry && referenceByKey && referenceByEntry.materialId !== referenceByKey.materialId) {
    throw new Error(
      `Widersprüchliche Materialreferenz im Lager: Schlüssel ${storageKey} verweist auf ID ${referenceByKey.materialId}, ` +
      `Eintrag auf ID ${referenceByEntry.materialId}.`
    );
  }

  return referenceByEntry ?? referenceByKey;
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

function ensureCanonicalEntry(
  inventory: MaterialStorageInventory,
  resolved: ResolvedMaterialStorageEntry
): ResolvedMaterialStorageEntry {
  const canonicalKey = String(resolved.materialId);
  if (resolved.storageKey === canonicalKey) return resolved;

  const existing = inventory[canonicalKey];
  if (existing && existing !== resolved.entry) {
    throw new Error(`Doppelter Materialbestand für ID ${resolved.materialId}: ${resolved.storageKey} und ${canonicalKey}.`);
  }

  delete inventory[resolved.storageKey];
  inventory[canonicalKey] = resolved.entry;
  return resolvedEntry(canonicalKey, resolved.entry, getMaterialReferenceById(resolved.materialId)!);
}

/**
 * Migriert alle bekannten Lagerbestände auf ID-Schlüssel und korrigiert ihre
 * Selbstbeschreibung. Unbekannte Legacy-Einträge bleiben unangetastet, werden
 * von der aktiven Fachlogik aber nicht als Materialbestand interpretiert.
 */
export function normalizeMaterialInventory(inventory: MaterialStorageInventory): number {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return 0;

  const resolvedEntries: Array<{
    storageKey: string;
    entry: MaterialStorageInventoryEntry;
    reference: MaterialReference;
  }> = [];
  const seenMaterialIds = new Map<number, string>();

  for (const [storageKey, entry] of Object.entries(inventory)) {
    if (!entry || typeof entry !== 'object') continue;
    const reference = resolveMaterialReference(storageKey, entry);
    if (!reference) continue;

    const previousKey = seenMaterialIds.get(reference.materialId);
    if (previousKey && previousKey !== storageKey) {
      throw new Error(
        `Doppelter Materialbestand für ID ${reference.materialId}: ${previousKey} und ${storageKey}.`
      );
    }
    seenMaterialIds.set(reference.materialId, storageKey);
    resolvedEntries.push({ storageKey, entry, reference });
  }

  let changedEntries = 0;
  for (const { storageKey, entry, reference } of resolvedEntries) {
    let changed = false;
    if (entry.materialId !== reference.materialId) {
      entry.materialId = reference.materialId;
      changed = true;
    }
    if (entry.category !== reference.definition.category) {
      entry.category = reference.definition.category;
      changed = true;
    }

    const canonicalKey = String(reference.materialId);
    if (storageKey !== canonicalKey) {
      const existing = inventory[canonicalKey];
      if (existing && existing !== entry) {
        throw new Error(`Doppelter Materialbestand für ID ${reference.materialId}: ${storageKey} und ${canonicalKey}.`);
      }
      delete inventory[storageKey];
      inventory[canonicalKey] = entry;
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

  const canonicalKey = String(reference.materialId);
  const canonicalEntry = inventory[canonicalKey];
  if (canonicalEntry) {
    const canonicalReference = resolveMaterialReference(canonicalKey, canonicalEntry);
    if (canonicalReference?.materialId === reference.materialId) {
      return resolvedEntry(canonicalKey, canonicalEntry, canonicalReference);
    }
  }

  // Nur für noch nicht normalisierte Altstände vor dem Runtime-Migrationsschritt.
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
  if (existing) existing = ensureCanonicalEntry(inventory, existing);
  if (!existing) {
    const entry: MaterialStorageInventoryEntry = {
      materialId: reference.materialId,
      category: reference.definition.category,
      qty: 0
    };
    const storageKey = String(reference.materialId);
    inventory[storageKey] = entry;
    existing = resolvedEntry(storageKey, entry, reference);
  }

  existing.entry.materialId = reference.materialId;
  existing.entry.category = reference.definition.category;
  existing.entry.qty = (Number(existing.entry.qty) || 0) + amount;
  return resolvedEntry(String(reference.materialId), existing.entry, reference);
}

export function takeMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined,
  quantity: number
): boolean {
  const amount = Number(quantity);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  let existing = getMaterialStorageEntryById(inventory, materialId);
  if (!existing || existing.qty < amount) return false;
  existing = ensureCanonicalEntry(inventory, existing);

  const remaining = existing.qty - amount;
  if (remaining > 0) {
    existing.entry.qty = remaining;
    existing.entry.materialId = existing.materialId;
    existing.entry.category = existing.category;
  } else {
    delete inventory[String(existing.materialId)];
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
