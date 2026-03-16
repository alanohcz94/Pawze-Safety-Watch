import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type HazardCategory =
  | "broken_glass"
  | "poison_bait"
  | "aggressive_dog"
  | "construction"
  | "spray_activity"
  | "ticks_fleas"
  | "stray_animal"
  | "flooding"
  | "ant_nest"
  | "waste"
  | "other";

export interface HazardIconConfig {
  label: string;
  iconFamily:
    | "MaterialCommunityIcons"
    | "Ionicons"
    | "FontAwesome5"
    | "MaterialIcons";
  iconName: string;
  color: string;
  bgColor: string;
  expiryMs: number;
  expiryLabel: string;
}

export const HAZARD_CONFIGS: Record<HazardCategory, HazardIconConfig> = {
  broken_glass: {
    label: "Broken Glass",
    iconFamily: "MaterialCommunityIcons",
    iconName: "glass-fragile",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    expiryMs: 7 * DAY_MS,
    expiryLabel: "7 days",
  },
  poison_bait: {
    label: "Poison Bait",
    iconFamily: "MaterialCommunityIcons",
    iconName: "skull-crossbones",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
    expiryMs: 14 * DAY_MS,
    expiryLabel: "14 days",
  },
  aggressive_dog: {
    label: "Aggressive Dog",
    iconFamily: "MaterialCommunityIcons",
    iconName: "dog",
    color: "#EA580C",
    bgColor: "#FFF7ED",
    expiryMs: 6 * HOUR_MS,
    expiryLabel: "6 hours",
  },
  construction: {
    label: "Construction",
    iconFamily: "MaterialCommunityIcons",
    iconName: "hard-hat",
    color: "#D97706",
    bgColor: "#FEF3C7",
    expiryMs: 14 * DAY_MS,
    expiryLabel: "14 days",
  },
  spray_activity: {
    label: "Spray Activity",
    iconFamily: "MaterialCommunityIcons",
    iconName: "spray",
    color: "#0891B2",
    bgColor: "#CFFAFE",
    expiryMs: 24 * HOUR_MS,
    expiryLabel: "24 hours",
  },
  ticks_fleas: {
    label: "Ticks / Fleas",
    iconFamily: "MaterialCommunityIcons",
    iconName: "bug",
    color: "#CA8A04",
    bgColor: "#FEF9C3",
    expiryMs: 14 * DAY_MS,
    expiryLabel: "14 days",
  },
  stray_animal: {
    label: "Stray Animal",
    iconFamily: "MaterialCommunityIcons",
    iconName: "cat",
    color: "#CA8A04",
    bgColor: "#FEF9C3",
    expiryMs: 48 * HOUR_MS,
    expiryLabel: "48 hours",
  },
  flooding: {
    label: "Flooding",
    iconFamily: "Ionicons",
    iconName: "water",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    expiryMs: 24 * HOUR_MS,
    expiryLabel: "24 hours",
  },
  ant_nest: {
    label: "Ant Nest",
    iconFamily: "MaterialCommunityIcons",
    iconName: "bug-outline",
    color: "#92400E",
    bgColor: "#FDE68A",
    expiryMs: 7 * DAY_MS,
    expiryLabel: "7 days",
  },
  waste: {
    label: "Waste / Poop",
    iconFamily: "MaterialCommunityIcons",
    iconName: "emoticon-poop",
    color: "#78350F",
    bgColor: "#FDE68A",
    expiryMs: 48 * HOUR_MS,
    expiryLabel: "48 hours",
  },
  other: {
    label: "Other",
    iconFamily: "MaterialIcons",
    iconName: "warning",
    color: "#6B7280",
    bgColor: "#F3F4F6",
    expiryMs: 3 * DAY_MS,
    expiryLabel: "3 days",
  },
};

export const HAZARD_CATEGORIES = Object.keys(
  HAZARD_CONFIGS,
) as HazardCategory[];

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
}

export function formatTimeRemaining(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = then - now;
  if (diffMs <= 0) return "Expired";
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
  if (diffDays > 0) return `${diffDays}d ${diffHrs}h`;
  return `${diffHrs}h`;
}

export function formatDistance(meters: number): string {
  return `${Math.round(meters / 1000)}km away`;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
