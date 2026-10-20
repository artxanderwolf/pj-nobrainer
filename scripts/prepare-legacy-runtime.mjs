import './data/build-game-data.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  GENERATED_LEGACY_RUNTIME_PATH,
  LEGACY_HTML_REFERENCE_PATH,
  extractLegacyRuntimeSource
} from './legacy-runtime-source.mjs';

const legacyHtml = readFileSync(LEGACY_HTML_REFERENCE_PATH, 'utf8');
const runtimeSource = extractLegacyRuntimeSource(legacyHtml);

mkdirSync(dirname(GENERATED_LEGACY_RUNTIME_PATH), { recursive: true });
writeFileSync(GENERATED_LEGACY_RUNTIME_PATH, runtimeSource, 'utf8');

console.log(`Legacy-Runtime vorbereitet: ${GENERATED_LEGACY_RUNTIME_PATH}`);
