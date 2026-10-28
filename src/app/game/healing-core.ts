export interface HealingTarget {
    hp: number;
    maxHp: number;
    alive: boolean;
}
/** Stable input order is the party-slot tie-breaker. Dead or full targets are excluded. */
export function selectHealingTarget<T extends HealingTarget>(party: readonly T[], threat: (target: T) => number): T | null {
    let best: T | null = null;
    for (const target of party) {
        if (!target.alive || target.hp <= 0 || target.maxHp <= 0 || target.hp >= target.maxHp)
            continue;
        if (!best || target.hp * best.maxHp < best.hp * target.maxHp || (target.hp * best.maxHp === best.hp * target.maxHp && threat(target) > threat(best)))
            best = target;
    }
    return best;
}
export function healParty<T extends HealingTarget>(party: readonly T[], amount: number, threat: (target: T) => number): {
    target: T;
    healed: number;
} | null {
    const target = selectHealingTarget(party, threat);
    if (!target)
        return null;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + Math.max(0, amount));
    return { target, healed: target.hp - before };
}
