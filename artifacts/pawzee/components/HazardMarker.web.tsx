import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HazardIcon } from "./HazardIcon";
import type { HazardItem } from "@/lib/api";
import type { HazardCategory } from "@/lib/hazards";

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
