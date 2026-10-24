import type { WeaponImageRenderPlan } from './weapon-image-presentation-core.ts';

export interface WeaponImageMarkupOptions {
  ariaLabel?: string | null;
  className?: string | null;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizedExtraClasses(value: string | null | undefined): string {
  return String(value ?? '')
    .split(/\s+/)
    .filter(token => /^[A-Za-z0-9_-]+$/.test(token))
    .join(' ');
}

function layerMarkup(layer: string, color: string, atlasCell: number): string {
  const maskX = atlasCell * -64;
  return `<span class="weapon-image-layer weapon-image-layer-${layer}" data-weapon-image-layer="${layer}" style="--weapon-image-color:${color};--weapon-mask-x:${maskX}px" aria-hidden="true"></span>`;
}

export function getWeaponImageMarkup(
  plan: WeaponImageRenderPlan,
  options: WeaponImageMarkupOptions = {}
): string {
  const extraClasses = normalizedExtraClasses(options.className);
  const classes = ['weapon-image', `weapon-image-${plan.kind}`, extraClasses].filter(Boolean).join(' ');
  const form = plan.weaponForm ?? 'generic';
  const fallback = plan.fallbackReason ? ` data-weapon-fallback="${plan.fallbackReason}"` : '';
  const ariaLabel = String(options.ariaLabel ?? '').trim();
  const accessibility = ariaLabel
    ? ` role="img" aria-label="${escapeAttribute(ariaLabel)}"`
    : ' aria-hidden="true"';

  if (plan.kind === 'generic-fallback') {
    return `<span class="${classes}" data-weapon-form="generic" data-weapon-image-kind="generic-fallback"${fallback}${accessibility}><span class="weapon-image-generic-shape" style="--weapon-image-color:${plan.silhouetteColor ?? '#8A8A8A'};--weapon-outline-color:${plan.outlineColor}" aria-hidden="true"></span></span>`;
  }

  const layers: string[] = [];
  if (plan.silhouetteColor) {
    layers.push(layerMarkup('silhouette', plan.silhouetteColor, plan.silhouetteAtlasCell));
  }
  for (const layer of plan.layers) {
    layers.push(layerMarkup(layer.slot, layer.color, layer.atlasCell));
  }
  layers.push(layerMarkup('outline', plan.outlineColor, plan.outlineAtlasCell));

  return `<span class="${classes}" data-weapon-form="${form}" data-weapon-image-kind="${plan.kind}"${fallback}${accessibility}>${layers.join('')}</span>`;
}
