import { MaterialCommunityIcons, Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";

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
  iconFamily: "MaterialCommunityIcons" | "Ionicons" | "FontAwesome5" | "MaterialIcons";
  iconName: string;
  color: string;
  bgColor: string;
}

export const HAZARD_CONFIGS: Record<HazardCategory, HazardIconConfig> = {
  broken_glass: {
    label: "Broken Glass",
    iconFamily: "MaterialCommunityIcons",
    iconName: "glass-fragile",
    color: "#DC2626",
    bgColor: "#FEE2E2",
  },
  poison_bait: {
    label: "Poison Bait",
    iconFamily: "MaterialCommunityIcons",
    iconName: "skull-crossbones",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
  },
  aggressive_dog: {
    label: "Aggressive Dog",
    iconFamily: "MaterialCommunityIcons",
    iconName: "dog",
    color: "#EA580C",
    bgColor: "#FFF7ED",
  },
  construction: {
    label: "Construction",
    iconFamily: "MaterialCommunityIcons",
    iconName: "hard-hat",
    color: "#D97706",
    bgColor: "#FEF3C7",
  },
  spray_activity: {
    label: "Spray Activity",
    iconFamily: "MaterialCommunityIcons",
    iconName: "spray",
    color: "#0891B2",
    bgColor: "#CFFAFE",
  },
  ticks_fleas: {
    label: "Ticks / Fleas",
    iconFamily: "MaterialCommunityIcons",
    iconName: "bug",
    color: "#65A30D",
    bgColor: "#ECFCCB",
  },
  stray_animal: {
    label: "Stray Animal",
    iconFamily: "MaterialCommunityIcons",
    iconName: "cat",
    color: "#CA8A04",
    bgColor: "#FEF9C3",
  },
  flooding: {
    label: "Flooding",
    iconFamily: "Ionicons",
    iconName: "water",
    color: "#2563EB",
    bgColor: "#DBEAFE",
  },
  ant_nest: {
    label: "Ant Nest",
    iconFamily: "MaterialCommunityIcons",
    iconName: "ant",
    color: "#92400E",
    bgColor: "#FDE68A",
  },
  waste: {
    label: "Waste / Poop",
    iconFamily: "MaterialCommunityIcons",
    iconName: "emoticon-poop",
    color: "#78350F",
    bgColor: "#FDE68A",
  },
  other: {
    label: "Other",
    iconFamily: "MaterialIcons",
    iconName: "warning",
    color: "#6B7280",
    bgColor: "#F3F4F6",
  },
};

export const HAZARD_CATEGORIES = Object.keys(HAZARD_CONFIGS) as HazardCategory[];

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
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
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
