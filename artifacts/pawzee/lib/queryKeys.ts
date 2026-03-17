import type { QueryClient } from "@tanstack/react-query";

const LOCATION_KEY_DECIMALS = 4;

const HAZARDS_QUERY_KEY = ["hazards"] as const;
const HAZARD_SUMMARY_QUERY_KEY = ["hazardSummary"] as const;
const AREA_WEATHER_QUERY_KEY = ["areaWeather"] as const;

function buildLocationKey(lat: number, lng: number): string {
  return `${lat.toFixed(LOCATION_KEY_DECIMALS)},${lng.toFixed(
    LOCATION_KEY_DECIMALS,
  )}`;
}

export const queryKeys = {
  hazards: {
    all: HAZARDS_QUERY_KEY,
    list: (lat: number, lng: number, radius: number) =>
      [...HAZARDS_QUERY_KEY, buildLocationKey(lat, lng), radius] as const,
  },
  hazardSummary: {
    all: HAZARD_SUMMARY_QUERY_KEY,
    detail: (lat: number, lng: number, radius: number) =>
      [
        ...HAZARD_SUMMARY_QUERY_KEY,
        buildLocationKey(lat, lng),
        radius,
      ] as const,
  },
  areaWeather: {
    all: AREA_WEATHER_QUERY_KEY,
    detail: (lat: number, lng: number, cacheWindowKey: number) =>
      [
        ...AREA_WEATHER_QUERY_KEY,
        buildLocationKey(lat, lng),
        cacheWindowKey,
      ] as const,
  },
};

export async function invalidateHazardQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.hazards.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.hazardSummary.all }),
  ]);
}
