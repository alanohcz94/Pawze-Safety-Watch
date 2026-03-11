import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import MapViewWrapper from "@/components/MapViewWrapper";
import type MapView from "react-native-maps";

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { fetchHazards, fetchHazardSummary } from "@/lib/api";
import type { HazardItem, HazardSummary } from "@/lib/api";
import { haversineDistance } from "@/lib/hazards";
import { HazardMarker, ClusterMarker } from "@/components/HazardMarker";
import { HazardDetailSheet } from "@/components/HazardDetailSheet";
import { SearchBar } from "@/components/SearchBar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { EmergencyVetSheet } from "@/components/EmergencyVetSheet";
import { SafetySummaryOverlay } from "@/components/SafetySummary";

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const CLUSTER_DISTANCE = 80;

interface ClusterGroup {
  hazards: HazardItem[];
  lat: number;
  lng: number;
}

function clusterHazards(hazards: HazardItem[], zoomLevel: number): ClusterGroup[] {
  if (zoomLevel > 14) {
    return hazards.map((h) => ({ hazards: [h], lat: h.lat, lng: h.lng }));
  }

  const clusters: ClusterGroup[] = [];
  const used = new Set<number>();
  const threshold = CLUSTER_DISTANCE * Math.pow(2, 15 - zoomLevel);

  for (let i = 0; i < hazards.length; i++) {
    if (used.has(i)) continue;
    const group: HazardItem[] = [hazards[i]];
    used.add(i);
    let sumLat = hazards[i].lat;
    let sumLng = hazards[i].lng;

    for (let j = i + 1; j < hazards.length; j++) {
      if (used.has(j)) continue;
      const dist = haversineDistance(
        hazards[i].lat,
        hazards[i].lng,
        hazards[j].lat,
        hazards[j].lng,
      );
      if (dist < threshold) {
        group.push(hazards[j]);
        used.add(j);
        sumLat += hazards[j].lat;
        sumLng += hazards[j].lng;
      }
    }

    clusters.push({
      hazards: group,
      lat: sumLat / group.length,
      lng: sumLng / group.length,
    });
  }

  return clusters;
}

function getZoomLevel(latDelta: number): number {
  return Math.round(Math.log2(360 / latDelta));
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, login } = useAuth();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationReady, setLocationReady] = useState(Platform.OS === "web");
  const [selectedHazard, setSelectedHazard] = useState<HazardItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showVet, setShowVet] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [summary, setSummary] = useState<HazardSummary | null>(null);
  const [zoomLevel, setZoomLevel] = useState(15);

  const [queryCenter, setQueryCenter] = useState<{ lat: number; lng: number } | null>(null);

  const centerLat = queryCenter?.lat ?? userLocation?.lat ?? DEFAULT_REGION.latitude;
  const centerLng = queryCenter?.lng ?? userLocation?.lng ?? DEFAULT_REGION.longitude;

  const { data: hazards = [], refetch: refetchHazards } = useQuery({
    queryKey: ["hazards", centerLat, centerLng],
    queryFn: () => fetchHazards(centerLat, centerLng, 5000),
    refetchInterval: 30000,
  });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationReady(true);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const newRegion: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
      } catch {
      }
      setLocationReady(true);
    })();

    const timeout = setTimeout(() => {
      setLocationReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const clusters = clusterHazards(hazards, zoomLevel);

  const handleRegionChange = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    setZoomLevel(getZoomLevel(newRegion.latitudeDelta));
  }, []);

  const handleHazardPress = (hazard: HazardItem) => {
    setSelectedHazard(hazard);
    setShowDetail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClusterPress = (cluster: ClusterGroup) => {
    const newRegion: Region = {
      latitude: cluster.lat,
      longitude: cluster.lng,
      latitudeDelta: region.latitudeDelta / 3,
      longitudeDelta: region.longitudeDelta / 3,
    };
    mapRef.current?.animateToRegion(newRegion, 400);
  };

  const handleSearch = async (query: string) => {
    try {
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        const newRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        mapRef.current?.animateToRegion(newRegion, 600);
        setSearchLocation(query);
        setQueryCenter({ lat: latitude, lng: longitude });

        const summaryData = await fetchHazardSummary(latitude, longitude, 5000);
        setSummary(summaryData);
        setShowSummary(true);
      } else {
        Alert.alert("Not Found", "Could not find that location.");
      }
    } catch {
      Alert.alert("Search Error", "Failed to search for location.");
    }
  };

  const handleReportPress = () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please log in to report hazards.", [
        { text: "Cancel" },
        { text: "Log In", onPress: login },
      ]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/report");
  };

  const handleVetPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowVet(true);
  };

  const handleRecenter = async () => {
    if (userLocation) {
      const newRegion: Region = {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(newRegion, 500);
      setQueryCenter(null);
      setShowSummary(false);
    }
  };

  if (!locationReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapViewWrapper
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapPadding={{ top: insets.top + 60, bottom: 120, left: 0, right: 0 }}
      >
        {clusters.map((cluster, idx) =>
          cluster.hazards.length === 1 ? (
            <HazardMarker
              key={cluster.hazards[0].id}
              hazard={cluster.hazards[0]}
              onPress={handleHazardPress}
            />
          ) : (
            <ClusterMarker
              key={`cluster-${idx}`}
              count={cluster.hazards.length}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              onPress={() => handleClusterPress(cluster)}
            />
          ),
        )}
      </MapViewWrapper>

      {/* Top Left - Menu Button */}
      <Pressable
        style={[styles.menuBtn, { top: insets.top + (Platform.OS === "web" ? 67 : 12) }]}
        onPress={() => {
          setShowProfile(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="menu" size={22} color={Colors.text} />
      </Pressable>

      {/* Top Right - Recenter */}
      <Pressable
        style={[styles.recenterBtn, { top: insets.top + (Platform.OS === "web" ? 67 : 12) }]}
        onPress={handleRecenter}
      >
        <Ionicons name="locate" size={20} color={Colors.primary} />
      </Pressable>

      {/* Safety Summary Overlay */}
      {showSummary && (
        <View style={[styles.summaryContainer, { top: insets.top + (Platform.OS === "web" ? 120 : 70) }]}>
          <SafetySummaryOverlay
            summary={summary}
            visible={showSummary}
            onClose={() => setShowSummary(false)}
            locationName={searchLocation}
          />
        </View>
      )}

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16) }]}>
        {/* Emergency Vet - Bottom Left */}
        <Pressable style={styles.emergencyBtn} onPress={handleVetPress}>
          <MaterialCommunityIcons name="hospital-building" size={22} color="#FFF" />
        </Pressable>

        {/* Search Bar - Bottom Center */}
        <View style={styles.searchContainer}>
          <SearchBar onSearch={handleSearch} />
        </View>

        {/* Report Hazard - Bottom Right */}
        <Pressable style={styles.reportBtn} onPress={handleReportPress}>
          <Ionicons name="warning" size={22} color="#FFF" />
        </Pressable>
      </View>

      {/* Sheets */}
      <HazardDetailSheet
        hazard={selectedHazard}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        userLat={userLocation?.lat ?? null}
        userLng={userLocation?.lng ?? null}
        onConfirmed={() => refetchHazards()}
      />

      <ProfileMenu visible={showProfile} onClose={() => setShowProfile(false)} />

      <EmergencyVetSheet
        visible={showVet}
        onClose={() => setShowVet(false)}
        userLat={userLocation?.lat ?? null}
        userLng={userLocation?.lng ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  map: {
    flex: 1,
  },
  menuBtn: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  summaryContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    gap: 12,
  },
  emergencyBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  searchContainer: {
    flex: 1,
  },
  reportBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
