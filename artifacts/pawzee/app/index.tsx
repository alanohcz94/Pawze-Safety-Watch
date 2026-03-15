import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import MapViewWrapper from "@/components/MapViewWrapper";
import type MapView from "react-native-maps";
import { styles } from "./indexStyleSheet";
import {
  DEFAULT_REGION,
  CLUSTER_DISTANCE,
  Region,
  ClusterGroup,
} from "./constant";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { fetchHazards, fetchHazardSummary } from "@/lib/api";
import type { HazardItem, HazardSummary } from "@/lib/api";
import { haversineDistance } from "@/lib/hazards";
import { HazardMarker, ClusterMarker } from "@/components/HazardMarker";
import { HazardDetailSheet } from "@/components/HazardDetailSheet";
import { SearchBar, type SearchResult } from "@/components/SearchBar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { EmergencyVetSheet } from "@/components/EmergencyVetSheet";
import { SafetySummaryOverlay } from "@/components/SafetySummary";

function clusterHazards(
  hazards: HazardItem[],
  zoomLevel: number,
): ClusterGroup[] {
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

  const [queryCenter, setQueryCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const centerLat =
    queryCenter?.lat ?? userLocation?.lat ?? DEFAULT_REGION.latitude;
  const centerLng =
    queryCenter?.lng ?? userLocation?.lng ?? DEFAULT_REGION.longitude;

  const { data: hazards = [], refetch: refetchHazards } = useQuery({
    queryKey: ["hazards", centerLat, centerLng],
    queryFn: () => fetchHazards(centerLat, centerLng, 3000),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!selectedHazard) return;

    const latestHazard = hazards.find(
      (hazard) => hazard.id === selectedHazard.id,
    );
    if (latestHazard) {
      setSelectedHazard({
        ...latestHazard,
        userHasConfirmed:
          latestHazard.userHasConfirmed || selectedHazard.userHasConfirmed,
      });
    }
  }, [hazards, selectedHazard?.id]);

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
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
      } catch {}
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

  const handleHazardUpdated = (updatedHazard: HazardItem) => {
    setSelectedHazard(updatedHazard);
    queryClient.setQueryData<HazardItem[]>(
      ["hazards", centerLat, centerLng],
      (current = []) =>
        current.map((hazard) =>
          hazard.id === updatedHazard.id ? updatedHazard : hazard,
        ),
    );
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

  const handleSearch = async (result: SearchResult) => {
    try {
      const { latitude, longitude, label } = result;
      const newRegion: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      mapRef.current?.animateToRegion(newRegion, 600);
      setSearchLocation(label);
      setQueryCenter({ lat: latitude, lng: longitude });

      const summaryData = await fetchHazardSummary(latitude, longitude, 3000);
      setSummary(summaryData);
      setShowSummary(true);
    } catch {
      Alert.alert("Search Error", "Failed to search for location.");
    }
  };

  const handleReportPress = () => {
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

      {/* Top Left - Menu Button  Collapse*/}
      <Pressable
        style={[
          styles.menuBtn,
          { top: insets.top + (Platform.OS === "web" ? 67 : 12) },
        ]}
        onPress={() => {
          setShowProfile(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="menu" size={22} color={Colors.text} />
      </Pressable>

      {/* Top Right - Recenter location*/}
      <Pressable
        style={[
          styles.recenterBtn,
          { top: insets.top + (Platform.OS === "web" ? 67 : 12) },
        ]}
        onPress={handleRecenter}
      >
        <Ionicons name="locate" size={20} color={Colors.primary} />
      </Pressable>

      {/* Safety Summary Overlay */}
      {showSummary && (
        <View
          style={[
            styles.summaryContainer,
            { top: insets.top + (Platform.OS === "web" ? 120 : 70) },
          ]}
        >
          <SafetySummaryOverlay
            summary={summary}
            visible={showSummary}
            onClose={() => setShowSummary(false)}
            locationName={searchLocation}
          />
        </View>
      )}

      {/* Bottom Controls */}
      <View
        style={[
          styles.bottomControls,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Emergency Vet - Bottom Left */}
        <Pressable style={styles.emergencyBtn} onPress={handleVetPress}>
          <MaterialCommunityIcons
            name="hospital-building"
            size={22}
            color="#FFF"
          />
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
        onHazardUpdated={handleHazardUpdated}
      />

      <ProfileMenu
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <EmergencyVetSheet
        visible={showVet}
        onClose={() => setShowVet(false)}
        userLat={userLocation?.lat ?? null}
        userLng={userLocation?.lng ?? null}
      />
    </View>
  );
}
