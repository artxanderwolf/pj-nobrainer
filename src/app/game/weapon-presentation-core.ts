export type WeaponComparisonTone = 'good' | 'bad' | 'same';

export interface WeaponComparisonPresentation {
  text: string;
  tone: WeaponComparisonTone;
}

export interface WeaponCardStatsLike {
  damagePerHit?: number | null;
  attackSpeed?: number | null;
  hitChance?: number | null;
  penetration?: number | null;
  expectedRaw?: number | null;
  reinforcementMaterial?: string | null;
}

export interface WeaponCardLike {
  id?: number | string | null;
  name?: string | null;
  starter?: boolean | null;
  weaponForm?: string | null;
  slots?: readonly unknown[] | null;
  stats?: WeaponCardStatsLike | null;
  valueNickel?: number | null;
}

export interface WeaponPresentationDependencies {
  resolveFormName(weaponForm: string | null | undefined, starter: boolean): string;
  rarityFactor(slots: readonly unknown[] | null | undefined): number;
  reinforcementEffectText(materialName: string | null | undefined): string;
}

export interface WeaponTextValuePresentation {
  kind: 'text';
  text: string;
}

export interface WeaponCurrencyValuePresentation {
  kind: 'currency';
  nickel: number;
}

export type WeaponValuePresentation = WeaponTextValuePresentation | WeaponCurrencyValuePresentation;

export interface WeaponStatPresentation {
  key: 'damagePerHit' | 'attackSpeed' | 'hitChance' | 'penetration' | 'expectedRaw' | 'value';
  label: 'SCH' | 'GES' | 'TRF' | 'DS' | 'ROH' | 'WERT';
  value: WeaponValuePresentation;
  diff: WeaponComparisonPresentation | null;
}

export interface WeaponCardPresentation {
  title: string;
  formName: string;
  rarityLabel: string;
  reinforcementText: string;
  stats: WeaponStatPresentation[];
}

function numeric(value: number | null | undefined): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function getComparisonPresentation(
  value: number,
  baseline: number | null | undefined,
  percentage = false
): WeaponComparisonPresentation | null {
  if (baseline === null || baseline === undefined) {
    return null;
  }

  const delta = numeric(value) - numeric(baseline);
  if (Math.abs(delta) < 0.0005) {
    return { text: `(±0${percentage ? ' %' : ''})`, tone: 'same' };
  }

  const magnitude = percentage
    ? `${Math.round(Math.abs(delta) * 100)} %`
    : Math.abs(delta).toFixed(2);

  return {
    text: `(${delta > 0 ? '+' : '−'}${magnitude})`,
    tone: delta > 0 ? 'good' : 'bad'
  };
}

export function createWeaponPresentationCore(dependencies: WeaponPresentationDependencies) {
  function getRarityLabel(weapon: WeaponCardLike): string {
    if (weapon.starter) {
      return 'START';
    }
    return `S${dependencies.rarityFactor(weapon.slots)}`;
  }

  function getWeaponCardPresentation(
    weapon: WeaponCardLike,
    compareWeapon: WeaponCardLike | null = null
  ): WeaponCardPresentation {
    const stats = weapon.stats ?? {};
    const compareStats = compareWeapon?.stats ?? null;
    const reinforcement = dependencies.reinforcementEffectText(stats.reinforcementMaterial);
    const starter = Boolean(weapon.starter);

    const damagePerHit = numeric(stats.damagePerHit);
    const attackSpeed = numeric(stats.attackSpeed);
    const hitChance = numeric(stats.hitChance);
    const penetration = numeric(stats.penetration);
    const expectedRaw = numeric(stats.expectedRaw);

    const valuePresentation: WeaponValuePresentation =
      weapon.valueNickel !== null && weapon.valueNickel !== undefined
        ? { kind: 'currency', nickel: numeric(weapon.valueNickel) }
        : starter
          ? { kind: 'text', text: 'Nicht verkäuflich' }
          : { kind: 'text', text: '–' };

    return {
      title: `${weapon.name ?? ''} #${weapon.id ?? ''}`,
      formName: dependencies.resolveFormName(weapon.weaponForm, starter),
      rarityLabel: getRarityLabel(weapon),
      reinforcementText: reinforcement && reinforcement !== 'Kein Zusatzeffekt' ? reinforcement : '',
      stats: [
        {
          key: 'damagePerHit',
          label: 'SCH',
          value: { kind: 'text', text: damagePerHit.toFixed(2) },
          diff: getComparisonPresentation(damagePerHit, compareStats?.damagePerHit)
        },
        {
          key: 'attackSpeed',
          label: 'GES',
          value: { kind: 'text', text: attackSpeed.toFixed(2) },
          diff: getComparisonPresentation(attackSpeed, compareStats?.attackSpeed)
        },
        {
          key: 'hitChance',
          label: 'TRF',
          value: { kind: 'text', text: `${Math.round(hitChance * 100)} %` },
          diff: getComparisonPresentation(hitChance, compareStats?.hitChance, true)
        },
        {
          key: 'penetration',
          label: 'DS',
          value: { kind: 'text', text: `${Math.round(penetration * 100)} %` },
          diff: getComparisonPresentation(penetration, compareStats?.penetration, true)
        },
        {
          key: 'expectedRaw',
          label: 'ROH',
          value: { kind: 'text', text: expectedRaw.toFixed(2) },
          diff: getComparisonPresentation(expectedRaw, compareStats?.expectedRaw)
        },
        {
          key: 'value',
          label: 'WERT',
          value: valuePresentation,
          diff: null
        }
      ]
    };
  }

  return { getComparisonPresentation, getRarityLabel, getWeaponCardPresentation };
}

export type WeaponPresentationCoreBridge = ReturnType<typeof createWeaponPresentationCore>;
