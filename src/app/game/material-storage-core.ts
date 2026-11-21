import {
  getMaterialIdByName,
  getMaterialReferenceById,
  type MaterialCategory,
  type MaterialReference
} from './game-core.ts';
import { resolveMaterialQuality, type MaterialQuality } from './material-quality-core.ts';

export interface MaterialStorageInventoryEntry {
  /** Redundante Selbstbeschreibung für Save-Diagnose; der kanonische Schluessel ist Material-ID:Qualitaet. */
  materialId?: number | null;
  quality?: MaterialQuality | null;
  category?: string;
  qty?: number | null;
  [key: string]: unknown;
}

/**
 * JSON-Objektschlüssel sind Strings. Für bekannte Materialien ist ausschließlich
 * materialId:quality kanonisch; Namensschlüssel werden nur beim Laden alter Saves akzeptiert.
 */
export type MaterialStorageInventory = Record<string, MaterialStorageInventoryEntry | undefined>;
export type MaterialQuantityRequirements = Readonly<Record<string, number>>;

export interface ResolvedMaterialStorageEntry {
  storageKey: string;
  materialId: number;
  quality: MaterialQuality;
  displayName: string;
  category: MaterialCategory;
  qty: number;
  entry: MaterialStorageInventoryEntry;
}

export function getMaterialStorageKey(materialId: number | null | undefined, quality?: MaterialQuality | null): string | null {
  const reference = getMaterialReferenceById(materialId);
  return reference ? `${reference.materialId}:${resolveMaterialQuality(quality, reference.definition.rarity as MaterialQuality)}` : null;
}

export function parseMaterialStorageKey(key: string): {materialId: number; quality: MaterialQuality} | null {
  const pair = /^(\d+):([1-6])$/.exec(key);
  const reference = getMaterialReferenceById(pair ? Number(pair[1]) : Number(key))
    ?? (!key.includes(':') ? getMaterialReferenceById(getMaterialIdByName(key)) : null);
  if (!reference) return null;
  return { materialId: reference.materialId, quality: pair ? Number(pair[2]) as MaterialQuality : reference.definition.rarity as MaterialQuality };
}
function getMaterialReferenceByStorageKey(key: string): MaterialReference | null {
  return getMaterialReferenceById(parseMaterialStorageKey(key)?.materialId);
}
function entryQuality(key: string, entry: MaterialStorageInventoryEntry, reference: MaterialReference): MaterialQuality {
  const pair = parseMaterialStorageKey(key);
  const quality = resolveMaterialQuality(entry.quality, pair?.quality ?? reference.definition.rarity as MaterialQuality);
  if (key.includes(':') && (!pair || pair.quality !== quality)) throw new Error(`Widerspruechliche Materialqualitaet: ${key}.`);
  return quality;
}

function resolveMaterialReference(
  storageKey: string,
  entry: MaterialStorageInventoryEntry
): MaterialReference | null {
  if (entry.materialId != null && !getMaterialReferenceById(entry.materialId)) throw new Error(`Ungueltige Material-ID: ${storageKey}.`);
  if (storageKey.includes(':') && !parseMaterialStorageKey(storageKey)) throw new Error(`Ungueltiger Materialschluessel: ${storageKey}.`);
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
  if (!Number.isSafeInteger(entry.qty ?? 0) || Number(entry.qty ?? 0) < 0) throw new Error(`Ungueltige Materialmenge: ${storageKey}.`);
  return {
    storageKey,
    materialId: reference.materialId,
    quality: entryQuality(storageKey, entry, reference),
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
  const canonicalKey = getMaterialStorageKey(resolved.materialId, resolved.quality)!;
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
  const seenMaterialIds = new Map<string, string>();

  for (const [storageKey, entry] of Object.entries(inventory)) {
    if (!entry || typeof entry !== 'object') continue;
    const reference = resolveMaterialReference(storageKey, entry);
    if (!reference) continue;

    const key = getMaterialStorageKey(reference.materialId, entryQuality(storageKey, entry, reference))!;
    resolvedEntry(storageKey, entry, reference);
    const previousKey = seenMaterialIds.get(key);
    if (previousKey && previousKey !== storageKey) {
      throw new Error(
        `Doppelter Materialbestand für ID ${reference.materialId}: ${previousKey} und ${storageKey}.`
      );
    }
    seenMaterialIds.set(key, storageKey);
    resolvedEntries.push({ storageKey, entry, reference });
  }

  let changedEntries = 0;
  for (const { storageKey, entry, reference } of resolvedEntries) {
    let changed = false;
    const quality = entryQuality(storageKey, entry, reference);
    if (entry.quality !== quality) { entry.quality = quality; changed = true; }
    if (entry.materialId !== reference.materialId) {
      entry.materialId = reference.materialId;
      changed = true;
    }
    if (entry.category !== reference.definition.category) {
      entry.category = reference.definition.category;
      changed = true;
    }

    const canonicalKey = getMaterialStorageKey(reference.materialId, entry.quality)!;
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
  materialId: number | null | undefined,
  quality?: MaterialQuality | null
): ResolvedMaterialStorageEntry | null {
  const reference = getMaterialReferenceById(materialId);
  if (!reference) return null;

  const canonicalKey = getMaterialStorageKey(reference.materialId, quality)!;
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
    if (candidate?.materialId === reference.materialId && getMaterialStorageKey(candidate.materialId, entryQuality(storageKey, entry, candidate)) === canonicalKey) return resolvedEntry(storageKey, entry, candidate);
  }

  return null;
}

export function getMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined,
  quality?: MaterialQuality | null
): number {
  return getMaterialStorageEntryById(inventory, materialId, quality)?.qty ?? 0;
}

export function addMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined,
  quantity: number,
  quality?: MaterialQuality | null
): ResolvedMaterialStorageEntry | null {
  const reference = getMaterialReferenceById(materialId);
  const amount = Number(quantity);
  if (!reference || !Number.isSafeInteger(amount) || amount <= 0) return null;

  let existing = getMaterialStorageEntryById(inventory, reference.materialId, quality);
  if (existing) existing = ensureCanonicalEntry(inventory, existing);
  if (!existing) {
    const entry: MaterialStorageInventoryEntry = {
      materialId: reference.materialId,
      quality: resolveMaterialQuality(quality, reference.definition.rarity as MaterialQuality),
      category: reference.definition.category,
      qty: 0
    };
    const storageKey = getMaterialStorageKey(reference.materialId, quality)!;
    inventory[storageKey] = entry;
    existing = resolvedEntry(storageKey, entry, reference);
  }

  existing.entry.materialId = reference.materialId;
  existing.entry.quality = existing.quality;
  existing.entry.category = reference.definition.category;
  const total = (Number(existing.entry.qty) || 0) + amount;
  if (!Number.isSafeInteger(total)) throw new Error('Materialmenge zu gross.');
  existing.entry.qty = total;
  return resolvedEntry(getMaterialStorageKey(reference.materialId, existing.quality)!, existing.entry, reference);
}

export function takeMaterialQuantityById(
  inventory: MaterialStorageInventory,
  materialId: number | null | undefined,
  quantity: number,
  quality?: MaterialQuality | null
): boolean {
  const amount = Number(quantity);
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  let existing = getMaterialStorageEntryById(inventory, materialId, quality);
  if (!existing || existing.qty < amount) return false;
  existing = ensureCanonicalEntry(inventory, existing);

  const remaining = existing.qty - amount;
  if (remaining > 0) {
    existing.entry.qty = remaining;
    existing.entry.materialId = existing.materialId;
    existing.entry.category = existing.category;
  } else {
    delete inventory[getMaterialStorageKey(existing.materialId, existing.quality)!];
  }
  return true;
}

/** Prüft zuerst alle Mengen und zieht sie anschließend atomar per Material-ID ab. */
export function reserveMaterialQuantitiesById(
  inventory: MaterialStorageInventory,
  requirements: MaterialQuantityRequirements
): boolean {
  const normalized = Object.entries(requirements)
    .map(([key, quantity]) => ({ ...parseMaterialStorageKey(key), quantity }));

  const keys = normalized.map(item => getMaterialStorageKey(item.materialId, item.quality));
  if (new Set(keys).size !== keys.length) return false;
  if (normalized.some(requirement => !requirement.materialId || !Number.isSafeInteger(requirement.quantity) || requirement.quantity <= 0)) return false;
  if (normalized.some(requirement => getMaterialQuantityById(inventory, requirement.materialId, requirement.quality) < requirement.quantity)) {
    return false;
  }

  for (const requirement of normalized) {
    if (!takeMaterialQuantityById(inventory, requirement.materialId, requirement.quantity, requirement.quality)) {
      throw new Error(`Materialbestand änderte sich während einer synchronen Reservierung: ID ${requirement.materialId}.`);
    }
  }
  return true;
}
