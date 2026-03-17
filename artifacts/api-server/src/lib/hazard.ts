const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const MAX_EXPIRY_MS = 14 * DAY_MS;
const NO_CONFIRMATION_MULTIPLIER = 0.5;
const CONFIRMED_MULTIPLIER = 1.2;

export interface HazardRule {
  baseExpiryMs: number;
}

export const HAZARD_RULES: Record<string, HazardRule> = {
  broken_glass: {
    baseExpiryMs: 7 * DAY_MS,
  },
  poison_bait: {
    baseExpiryMs: 14 * DAY_MS,
  },
  aggressive_dog: {
    baseExpiryMs: 6 * HOUR_MS,
  },
  construction: {
    baseExpiryMs: 14 * DAY_MS,
  },
  spray_activity: {
    baseExpiryMs: 24 * HOUR_MS,
  },
  ticks_fleas: {
    baseExpiryMs: 14 * DAY_MS,
  },
  stray_animal: {
    baseExpiryMs: 48 * HOUR_MS,
  },
  flooding: {
    baseExpiryMs: 24 * HOUR_MS,
  },
  ant_nest: {
    baseExpiryMs: 7 * DAY_MS,
  },
  waste: {
    baseExpiryMs: 48 * HOUR_MS,
  },
  other: {
    baseExpiryMs: 3 * DAY_MS,
  },
};

interface HazardExpiryInput {
  category: string;
  reportedAt: Date;
  photoUrl?: string | null;
  confirmationCount: number;
  refreshAt?: Date;
}

export function getHazardRule(category: string): HazardRule {
  return HAZARD_RULES[category] ?? HAZARD_RULES.other;
}

export function calculateHazardExpiry({
  category,
  reportedAt,
  photoUrl,
  confirmationCount,
  refreshAt,
}: HazardExpiryInput): Date {
  const hasPhoto = typeof photoUrl === "string" && photoUrl.trim().length > 0;
  const { baseExpiryMs } = getHazardRule(category);
  const anchorAt =
    refreshAt && refreshAt.getTime() > reportedAt.getTime()
      ? refreshAt
      : reportedAt;

  let adjustedExpiryMs = baseExpiryMs;
  if (confirmationCount > 0) {
    adjustedExpiryMs = baseExpiryMs * CONFIRMED_MULTIPLIER;
  } else if (!hasPhoto) {
    adjustedExpiryMs = baseExpiryMs * NO_CONFIRMATION_MULTIPLIER;
  }

  return new Date(
    anchorAt.getTime() + Math.min(adjustedExpiryMs, MAX_EXPIRY_MS),
  );
}
