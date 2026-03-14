import React from "react";
import { View } from "react-native";
import type { HazardItem } from "@/lib/api";

interface HazardMarkerProps {
  hazard: HazardItem;
  onPress: (hazard: HazardItem) => void;
}

export function HazardMarker({ hazard, onPress }: HazardMarkerProps) {
  return <View />;
}

interface ClusterMarkerProps {
  count: number;
  coordinate: { latitude: number; longitude: number };
  onPress: () => void;
}

export function ClusterMarker({ count, coordinate, onPress }: ClusterMarkerProps) {
  return <View />;
}
