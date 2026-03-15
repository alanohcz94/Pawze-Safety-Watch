import type { HazardItem, HazardSummary } from "@/lib/api";

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export const CLUSTER_DISTANCE = 80;

export interface ClusterGroup {
  hazards: HazardItem[];
  lat: number;
  lng: number;
}
