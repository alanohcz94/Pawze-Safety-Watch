import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import * as Notifications from "expo-notifications";
import MapViewWrapper from "@/components/MapViewWrapper";
import type MapView from "react-native-maps";
import { createStyles } from "./indexStyleSheet";
import { useResponsive } from "@/lib/responsive";
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
import type { HazardItem } from "@/lib/api";
import { haversineDistance, HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import {
  getPedometerStepCountAsync,
  isPedometerAvailableAsync,
  requestPedometerPermissionsAsync,
  supportsPedometerHistory,
  watchPedometerStepCount,
} from "@/lib/pedometer";
import { HazardMarker, ClusterMarker } from "@/components/HazardMarker";
import { Marker } from "@/components/MapViewWrapper";
import { HazardDetailSheet } from "@/components/HazardDetailSheet";
import { SearchBar, type SearchResult } from "@/components/SearchBar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { EmergencyVetSheet } from "@/components/EmergencyVetSheet";
import { SafetySummaryDashboard } from "@/components/SafetySummary";
import { WeatherReportBar } from "@/components/WeatherReportBar";
import { useSettings } from "@/lib/settings";
import {
  fetchAreaWeather,
  getMillisecondsUntilNextHour,
  getWeatherCacheWindowKey,
  WEATHER_CACHE_DURATION_MS,
} from "@/lib/weather";
import { queryKeys } from "@/lib/queryKeys";

const EMPTY_HAZARDS: HazardItem[] = [];

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

function formatAreaName(
  address: Location.LocationGeocodedAddress | null | undefined,
  fallback: string,
): string {
  if (!address) {
    return fallback;
  }

  const parts = [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
  ].filter(Boolean);

  return parts.slice(0, 2).join(", ") || parts[0] || fallback;
}

async function resolveAreaName(
  lat: number,
  lng: number,
  fallback: string,
): Promise<string> {
  try {
    const reverse = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    return formatAreaName(reverse[0], fallback);
  } catch {
    return fallback;
  }
}

interface HazardMapProps {
  hazards: HazardItem[];
  initialRegion: Region;
  mapPaddingTop: number;
  mapPaddingBottom: number;
  mapRef: React.RefObject<MapView | null>;
  onClusterPress: (cluster: ClusterGroup) => void;
  onHazardPress: (hazard: HazardItem) => void;
  onRegionChangeComplete: (region: Region) => void;
  searchPin: {
    lat: number;
    lng: number;
    label: string;
  } | null;
  zoomLevel: number;
}

const HazardMap = React.memo(function HazardMap({
  hazards,
  initialRegion,
  mapPaddingBottom,
  mapPaddingTop,
  mapRef,
  onClusterPress,
  onHazardPress,
  onRegionChangeComplete,
  searchPin,
  zoomLevel,
}: HazardMapProps) {
  const clusters = clusterHazards(hazards, zoomLevel);

  return (
    <MapViewWrapper
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      mapPadding={{
        top: mapPaddingTop,
        bottom: mapPaddingBottom,
        left: 0,
        right: 0,
      }}
    >
      {clusters.map((cluster, idx) =>
        cluster.hazards.length === 1 ? (
          <HazardMarker
            key={cluster.hazards[0].id}
            hazard={cluster.hazards[0]}
            onPress={onHazardPress}
          />
        ) : (
          <ClusterMarker
            key={`cluster-${idx}`}
            count={cluster.hazards.length}
            coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
            onPress={() => onClusterPress(cluster)}
          />
        ),
      )}
      {searchPin && (
        <Marker
          coordinate={{ latitude: searchPin.lat, longitude: searchPin.lng }}
          title={searchPin.label}
          pinColor="#1A9E8F"
        />
      )}
    </MapViewWrapper>
  );
});

export default function MapScreen() {
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(DEFAULT_REGION);
  const { alertRadius, stepCounter, notifications } = useSettings();
  const alertRadiusMeters = alertRadius * 1000;
  const notifiedHazardsRef = useRef<Set<string>>(new Set());

  const [initialRegion, setInitialRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationReady, setLocationReady] = useState(Platform.OS === "web");
  const [selectedHazard, setSelectedHazard] = useState<HazardItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showVet, setShowVet] = useState(false);
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState(15);
  const [todaySteps, setTodaySteps] = useState(0);
  const [showStepCounter, setShowStepCounter] = useState(false);
  const [loadingStepCounter, setLoadingStepCounter] = useState(false);
  const [stepCounterDayKey, setStepCounterDayKey] = useState(() =>
    new Date().toDateString(),
  );
  const [currentAreaName, setCurrentAreaName] = useState("Current area");
  const [searchedAreaName, setSearchedAreaName] = useState("");
  const [showWeatherDashboard, setShowWeatherDashboard] = useState(true);
  const [weatherCacheWindowKey, setWeatherCacheWindowKey] = useState(() =>
    getWeatherCacheWindowKey(),
  );
  const [searchPin, setSearchPin] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  const [queryCenter, setQueryCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const currentAreaLat = userLocation?.lat ?? DEFAULT_REGION.latitude;
  const currentAreaLng = userLocation?.lng ?? DEFAULT_REGION.longitude;
  const searchedAreaLat = queryCenter?.lat ?? DEFAULT_REGION.latitude;
  const searchedAreaLng = queryCenter?.lng ?? DEFAULT_REGION.longitude;
  const centerLat = queryCenter?.lat ?? currentAreaLat;
  const centerLng = queryCenter?.lng ?? currentAreaLng;

  const { data: hazards = EMPTY_HAZARDS } = useQuery({
    queryKey: queryKeys.hazards.list(centerLat, centerLng, alertRadiusMeters),
    queryFn: () => fetchHazards(centerLat, centerLng, alertRadiusMeters),
    refetchInterval: 30000,
  });
  const { data: currentAreaSummary = null, isLoading: loadingCurrentAreaSummary } =
    useQuery({
      queryKey: queryKeys.hazardSummary.detail(
        currentAreaLat,
        currentAreaLng,
        alertRadiusMeters,
      ),
      queryFn: () =>
        fetchHazardSummary(currentAreaLat, currentAreaLng, alertRadiusMeters),
      enabled: locationReady,
    });
  const {
    data: searchedAreaSummary = null,
    isLoading: loadingSearchedAreaSummary,
  } = useQuery({
    queryKey: queryKeys.hazardSummary.detail(
      searchedAreaLat,
      searchedAreaLng,
      alertRadiusMeters,
    ),
    queryFn: () =>
      fetchHazardSummary(searchedAreaLat, searchedAreaLng, alertRadiusMeters),
    enabled: !!queryCenter,
  });
  const { data: currentAreaWeather = null, isLoading: loadingCurrentAreaWeather } =
    useQuery({
      queryKey: queryKeys.areaWeather.detail(
        currentAreaLat,
        currentAreaLng,
        weatherCacheWindowKey,
      ),
      queryFn: () => fetchAreaWeather(currentAreaLat, currentAreaLng),
      enabled: locationReady,
      staleTime: WEATHER_CACHE_DURATION_MS,
      gcTime: WEATHER_CACHE_DURATION_MS,
    });
  const {
    data: searchedAreaWeather = null,
    isLoading: loadingSearchedAreaWeather,
  } = useQuery({
    queryKey: queryKeys.areaWeather.detail(
      searchedAreaLat,
      searchedAreaLng,
      weatherCacheWindowKey,
    ),
    queryFn: () => fetchAreaWeather(searchedAreaLat, searchedAreaLng),
    enabled: !!queryCenter,
    staleTime: WEATHER_CACHE_DURATION_MS,
    gcTime: WEATHER_CACHE_DURATION_MS,
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
        regionRef.current = newRegion;
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
        setInitialRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
      } catch {}
      setLocationReady(true);
    })();

    const timeout = setTimeout(() => {
      setLocationReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!stepCounter) {
      return;
    }

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);

    const timeout = setTimeout(() => {
      setStepCounterDayKey(new Date().toDateString());
    }, nextMidnight.getTime() - now.getTime());

    return () => clearTimeout(timeout);
  }, [stepCounter, stepCounterDayKey]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextWeatherRefresh = () => {
      timeout = setTimeout(() => {
        setWeatherCacheWindowKey(getWeatherCacheWindowKey());
        scheduleNextWeatherRefresh();
      }, getMillisecondsUntilNextHour());
    };

    scheduleNextWeatherRefresh();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  useEffect(() => {
    if (!stepCounter) {
      setTodaySteps(0);
      setShowStepCounter(false);
      setLoadingStepCounter(false);
      return;
    }

    let isActive = true;
    let subscription: { remove: () => void } | null = null;

    const loadTodaySteps = async () => {
      setLoadingStepCounter(true);
      setShowStepCounter(false);

      try {
        const isAvailable = await isPedometerAvailableAsync();
        if (!isActive || !isAvailable) {
          return;
        }

        const permission = await requestPedometerPermissionsAsync();
        if (!isActive || !permission.granted) {
          return;
        }

        let baseSteps = 0;
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        if (supportsPedometerHistory()) {
          try {
            const result = await getPedometerStepCountAsync(startOfDay, now);
            if (!isActive) {
              return;
            }
            baseSteps = result.steps;
          } catch {}
        }

        setTodaySteps(baseSteps);
        setShowStepCounter(true);

        subscription = watchPedometerStepCount((result) => {
          if (!isActive) {
            return;
          }
          setTodaySteps(baseSteps + result.steps);
        });
      } finally {
        if (isActive) {
          setLoadingStepCounter(false);
        }
      }
    };

    loadTodaySteps();

    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [stepCounter, stepCounterDayKey]);

  useEffect(() => {
    if (!locationReady) {
      return;
    }

    let isActive = true;

    const loadCurrentAreaName = async () => {
      try {
        const locationName = await resolveAreaName(
          currentAreaLat,
          currentAreaLng,
          "Current area",
        );

        if (isActive) {
          setCurrentAreaName(locationName);
        }
      } catch {
        if (isActive) {
          setCurrentAreaName("Current area");
        }
      }
    };

    loadCurrentAreaName();

    return () => {
      isActive = false;
    };
  }, [locationReady, currentAreaLat, currentAreaLng]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        if (status !== "granted") {
          return Notifications.requestPermissionsAsync();
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!notifications) return;
    if (!userLocation || hazards.length === 0) return;

    hazards.forEach((hazard) => {
      if (notifiedHazardsRef.current.has(hazard.id)) return;

      const dist = haversineDistance(
        userLocation.lat,
        userLocation.lng,
        hazard.lat,
        hazard.lng,
      );

      if (dist <= alertRadiusMeters) {
        notifiedHazardsRef.current.add(hazard.id);
        const config =
          HAZARD_CONFIGS[hazard.category as HazardCategory] ??
          HAZARD_CONFIGS.other;
        const distText =
          dist < 1000
            ? `${Math.round(dist)}m away`
            : `${(dist / 1000).toFixed(1)}km away`;
        resolveAreaName(hazard.lat, hazard.lng, "nearby location").then(
          (address) => {
            Notifications.scheduleNotificationAsync({
              content: {
                title: config.label,
                body: `${distText} · ${address}`,
              },
              trigger: null,
            }).catch(() => {});
          },
        );
      }
    });
  }, [hazards, userLocation, notifications, alertRadiusMeters]);

  const handleRegionChange = useCallback((newRegion: Region) => {
    regionRef.current = newRegion;
    const nextZoomLevel = getZoomLevel(newRegion.latitudeDelta);
    setZoomLevel((currentZoomLevel) =>
      currentZoomLevel === nextZoomLevel ? currentZoomLevel : nextZoomLevel,
    );
  }, []);

  const handleHazardPress = useCallback((hazard: HazardItem) => {
    setSelectedHazard(hazard);
    setShowDetail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleHazardUpdated = useCallback(
    (updatedHazard: HazardItem) => {
      setSelectedHazard(updatedHazard);
      queryClient.setQueriesData<HazardItem[]>(
        { queryKey: queryKeys.hazards.all },
        (current) =>
          current?.map((hazard) =>
            hazard.id === updatedHazard.id ? updatedHazard : hazard,
          ) ?? current,
      );
    },
    [queryClient],
  );

  const handleClusterPress = useCallback((cluster: ClusterGroup) => {
    const currentRegion = regionRef.current;
    const newRegion: Region = {
      latitude: cluster.lat,
      longitude: cluster.lng,
      latitudeDelta: currentRegion.latitudeDelta / 3,
      longitudeDelta: currentRegion.longitudeDelta / 3,
    };
    mapRef.current?.animateToRegion(newRegion, 400);
  }, []);

  const handleSearch = async (result: SearchResult) => {
    const { latitude, longitude, label } = result;
    const newRegion: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    mapRef.current?.animateToRegion(newRegion, 600);
    setSearchLocation(label);
    setSearchedAreaName(label);
    setQueryCenter({ lat: latitude, lng: longitude });
    setSearchPin({ lat: latitude, lng: longitude, label });
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (userLocation) {
      const newRegion: Region = {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(newRegion, 500);
    }

    setSearchLocation("");
    setSearchedAreaName("");
    setQueryCenter(null);
    setSearchPin(null);
  };

  const handleSafetySummaryViewChange = useCallback(
    (view: "summary" | "breakdown") => {
      setShowWeatherDashboard(view !== "breakdown");
    },
    [],
  );

  const showStepCounterChip =
    stepCounter && (loadingStepCounter || showStepCounter);
  const showingSearchArea = Boolean(queryCenter);
  const activeAreaName = showingSearchArea
    ? searchedAreaName || "Searched area"
    : currentAreaName;
  const activeAreaSummary = showingSearchArea
    ? searchedAreaSummary
    : currentAreaSummary;
  const activeAreaSummaryLoading = showingSearchArea
    ? loadingSearchedAreaSummary
    : loadingCurrentAreaSummary;
  const activeAreaWeather = showingSearchArea
    ? searchedAreaWeather
    : currentAreaWeather;
  const activeAreaWeatherLoading = showingSearchArea
    ? loadingSearchedAreaWeather
    : loadingCurrentAreaWeather;

  if (!locationReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, r.isTablet && styles.containerTablet]}>
      {/* Tablet: persistent side panel always visible */}
      {r.isTablet && (
        <ProfileMenu
          visible={true}
          onClose={() => {}}
          persistent
        />
      )}

      {/* Map content area (flex:1, relative) */}
      <View style={styles.mapContent}>
      <HazardMap
        hazards={hazards}
        initialRegion={initialRegion}
        mapPaddingBottom={insets.bottom + 310}
        mapPaddingTop={insets.top + 72}
        mapRef={mapRef}
        onClusterPress={handleClusterPress}
        onHazardPress={handleHazardPress}
        onRegionChangeComplete={handleRegionChange}
        searchPin={searchPin}
        zoomLevel={zoomLevel}
      />

      {/* Top Left - Menu Button (phone only) */}
      {!r.isTablet && (
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
      )}

      {showStepCounterChip && (
        <View
          style={[
            styles.stepCounterCard,
            { top: insets.top + (Platform.OS === "web" ? 67 : 12) },
          ]}
        >
          <View style={styles.stepCounterIcon}>
            {loadingStepCounter ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="footsteps" size={16} color={Colors.primary} />
            )}
          </View>
          <View style={styles.stepCounterContent}>
            <Text style={styles.stepCounterValue}>
              {loadingStepCounter ? "..." : todaySteps.toLocaleString()}
            </Text>
            <Text style={styles.stepCounterLabel}>Today</Text>
          </View>
        </View>
      )}

      {/* Bottom Controls */}
      <View
        style={[
          styles.bottomControls,
          {
            paddingBottom:
              Platform.OS === "web" ? 24 : Math.max(insets.bottom, 14),
          },
        ]}
      >
        <View style={styles.bottomControlRow}>
          {/* Emergency Vet - Bottom Left */}
          <Pressable style={styles.emergencyBtn} onPress={handleVetPress}>
            <MaterialCommunityIcons
              name="hospital-building"
              size={22}
              color={Colors.primary}
            />
          </Pressable>

          {/* Search Bar - Bottom Center */}
          <View style={styles.searchContainer}>
            <SearchBar
              onSearch={handleSearch}
              displayText={searchLocation}
              onRecenter={handleRecenter}
              recenterDisabled={!userLocation}
            />
          </View>

          {/* Report Hazard - Bottom Right */}
          <Pressable style={styles.reportBtn} onPress={handleReportPress}>
            <Ionicons name="warning" size={22} color={Colors.warning} />
          </Pressable>
        </View>

        <View style={styles.dashboardContainer}>
          <SafetySummaryDashboard
            summary={activeAreaSummary}
            locationName={activeAreaName}
            loading={activeAreaSummaryLoading}
            showingSearchLocation={showingSearchArea}
            onBackToCurrentLocation={handleRecenter}
            onViewChange={handleSafetySummaryViewChange}
          />
        </View>

        {showWeatherDashboard && (
          <View style={styles.dashboardContainer}>
            <WeatherReportBar
              weather={activeAreaWeather}
              loading={activeAreaWeatherLoading}
            />
          </View>
        )}
      </View>

      {/* Sheets */}
      <HazardDetailSheet
        hazard={selectedHazard}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        userLat={userLocation?.lat ?? null}
        userLng={userLocation?.lng ?? null}
        onHazardUpdated={handleHazardUpdated}
      />

      {/* Phone modal profile menu */}
      {!r.isTablet && (
        <ProfileMenu
          visible={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      <EmergencyVetSheet
        visible={showVet}
        onClose={() => setShowVet(false)}
        userLat={userLocation?.lat ?? null}
        userLng={userLocation?.lng ?? null}
      />
      </View>{/* closes mapContent */}
    </View>
  );
}
