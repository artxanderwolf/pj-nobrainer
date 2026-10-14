export const LEGACY_HTML_REFERENCE_PATH = 'NoBrainer_GitHub_v0.12.2.html';
export const GENERATED_LEGACY_RUNTIME_PATH = '.generated/NoBrainer_GitHub_v0.12.2.runtime.js';

export function extractLegacyRuntimeSource(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (matches.length !== 1) {
    throw new Error(`Legacy-Referenz enthält ${matches.length} Script-Blöcke statt genau einem.`);
  }
  return matches[0][1];
}
