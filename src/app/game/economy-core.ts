import * as baseline from './economy-core-v01310-baseline.ts';
import { GENERATED_ECONOMY_BALANCE } from './data/generated/economy-balance.generated.ts';

function replaceData(target: object, source: object): void {
  const mutable = target as Record<string, unknown>;
  for (const key of Object.keys(mutable)) delete mutable[key];
  Object.assign(mutable, JSON.parse(JSON.stringify(source)) as Record<string, unknown>);
}

replaceData(baseline.ECONOMY_BALANCE, GENERATED_ECONOMY_BALANCE);

export * from './economy-core-v01310-baseline.ts';
