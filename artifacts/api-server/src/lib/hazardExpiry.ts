const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_EXPIRY_MS = 14 * DAY_MS;
const NO_CONFIRMATION_MULTIPLIER = 0.5;
const CONFIRMED_MULTIPLIER = 1.2;

const BASE_EXPIRY_MS_BY_CATEGORY: Record<string, number> = {
  broken_glass: 7 * DAY_MS,
  poison_bait: 14 * DAY_MS,
  aggressive_dog: 6 * HOUR_MS,
  construction: 14 * DAY_MS,
  spray_activity: 24 * HOUR_MS,
  ticks_fleas: 14 * DAY_MS,
  stray_animal: 48 * HOUR_MS,
  flooding: 24 * HOUR_MS,
  ant_nest: 7 * DAY_MS,
  waste: 48 * HOUR_MS,
  other: 3 * DAY_MS,
};

interface HazardExpiryInput {
  category: string;
  reportedAt: Date;
  photoUrl?: string | null;
  confirmationCount: number;
}

function getBaseExpiryMs(category: string): number {
  return BASE_EXPIRY_MS_BY_CATEGORY[category] ?? BASE_EXPIRY_MS_BY_CATEGORY.other;
}

export function calculateHazardExpiry({
  category,
  reportedAt,
  photoUrl,
  confirmationCount,
}: HazardExpiryInput): Date {
  const hasPhoto = typeof photoUrl === "string" && photoUrl.trim().length > 0;
  const baseExpiryMs = getBaseExpiryMs(category);

  let adjustedExpiryMs = baseExpiryMs;
  if (confirmationCount > 0) {
    adjustedExpiryMs = baseExpiryMs * CONFIRMED_MULTIPLIER;
  } else if (!hasPhoto) {
    adjustedExpiryMs = baseExpiryMs * NO_CONFIRMATION_MULTIPLIER;
  }

  return new Date(
    reportedAt.getTime() + Math.min(adjustedExpiryMs, MAX_EXPIRY_MS),
  );
}
