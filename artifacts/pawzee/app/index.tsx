import React, { useState, useEffect, useRef, useCallback } from "react";
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
  type AreaWeatherReport,
} from "@/lib/weather";

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

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const { alertRadius, stepCounter, notifications } = useSettings();
  const alertRadiusMeters = alertRadius;
  const notifiedHazardsRef = useRef<Set<number>>(new Set());

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
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState(15);
  const [todaySteps, setTodaySteps] = useState(0);
  const [showStepCounter, setShowStepCounter] = useState(false);
  const [loadingStepCounter, setLoadingStepCounter] = useState(false);
  const [stepCounterDayKey, setStepCounterDayKey] = useState(() =>
    new Date().toDateString(),
  );
  const [currentAreaSummary, setCurrentAreaSummary] =
    useState<HazardSummary | null>(null);
  const [currentAreaName, setCurrentAreaName] = useState("Current area");
  const [loadingCurrentAreaSummary, setLoadingCurrentAreaSummary] =
    useState(false);
  const [searchedAreaSummary, setSearchedAreaSummary] =
    useState<HazardSummary | null>(null);
  const [searchedAreaName, setSearchedAreaName] = useState("");
  const [loadingSearchedAreaSummary, setLoadingSearchedAreaSummary] =
    useState(false);
  const [currentAreaWeather, setCurrentAreaWeather] =
    useState<AreaWeatherReport | null>(null);
  const [loadingCurrentAreaWeather, setLoadingCurrentAreaWeather] =
    useState(false);
  const [searchedAreaWeather, setSearchedAreaWeather] =
    useState<AreaWeatherReport | null>(null);
  const [loadingSearchedAreaWeather, setLoadingSearchedAreaWeather] =
    useState(false);
  const [showWeatherDashboard, setShowWeatherDashboard] = useState(true);
  const [weatherRefreshKey, setWeatherRefreshKey] = useState(0);
  const [searchPin, setSearchPin] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  const [queryCenter, setQueryCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const centerLat =
    queryCenter?.lat ?? userLocation?.lat ?? DEFAULT_REGION.latitude;
  const centerLng =
    queryCenter?.lng ?? userLocation?.lng ?? DEFAULT_REGION.longitude;

  const { data: hazards = [], refetch: refetchHazards } = useQuery({
    queryKey: ["hazards", centerLat, centerLng, alertRadiusMeters],
    queryFn: () => fetchHazards(centerLat, centerLng, alertRadiusMeters),
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
        setWeatherRefreshKey(Date.now());
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

    const lat = userLocation?.lat ?? DEFAULT_REGION.latitude;
    const lng = userLocation?.lng ?? DEFAULT_REGION.longitude;
    let isActive = true;

    const loadCurrentAreaSummary = async () => {
      setLoadingCurrentAreaSummary(true);

      try {
        const [summaryData, locationName] = await Promise.all([
          fetchHazardSummary(lat, lng, alertRadiusMeters),
          resolveAreaName(lat, lng, "Current area"),
        ]);

        if (!isActive) {
          return;
        }

        setCurrentAreaSummary(summaryData);
        setCurrentAreaName(locationName);
      } catch {
        if (!isActive) {
          return;
        }

        setCurrentAreaSummary(null);
        setCurrentAreaName("Current area");
      } finally {
        if (isActive) {
          setLoadingCurrentAreaSummary(false);
        }
      }
    };

    loadCurrentAreaSummary();

    return () => {
      isActive = false;
    };
  }, [locationReady, userLocation?.lat, userLocation?.lng, alertRadiusMeters]);

  useEffect(() => {
    if (!locationReady) {
      return;
    }

    const lat = userLocation?.lat ?? DEFAULT_REGION.latitude;
    const lng = userLocation?.lng ?? DEFAULT_REGION.longitude;
    let isActive = true;

    const loadCurrentAreaWeather = async () => {
      setLoadingCurrentAreaWeather(true);

      try {
        const weatherData = await fetchAreaWeather(lat, lng);
        if (!isActive) {
          return;
        }

        setCurrentAreaWeather(weatherData);
      } catch {
        if (!isActive) {
          return;
        }

        setCurrentAreaWeather(null);
      } finally {
        if (isActive) {
          setLoadingCurrentAreaWeather(false);
        }
      }
    };

    loadCurrentAreaWeather();

    return () => {
      isActive = false;
    };
  }, [locationReady, userLocation?.lat, userLocation?.lng, weatherRefreshKey]);

  useEffect(() => {
    if (!queryCenter) {
      setSearchedAreaSummary(null);
      setLoadingSearchedAreaSummary(false);
      return;
    }

    let isActive = true;

    const loadSearchedAreaSummary = async () => {
      setLoadingSearchedAreaSummary(true);

      try {
        const summaryData = await fetchHazardSummary(
          queryCenter.lat,
          queryCenter.lng,
          alertRadiusMeters,
        );

        if (!isActive) {
          return;
        }

        setSearchedAreaSummary(summaryData);
      } catch {
        if (!isActive) {
          return;
        }

        setSearchedAreaSummary(null);
      } finally {
        if (isActive) {
          setLoadingSearchedAreaSummary(false);
        }
      }
    };

    loadSearchedAreaSummary();

    return () => {
      isActive = false;
    };
  }, [queryCenter?.lat, queryCenter?.lng, alertRadiusMeters]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.requestPermissionsAsync().catch(() => {});
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
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
        Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ ${config.label} Nearby`,
            body: `A hazard is ${distText}. Stay safe on your walk!`,
          },
          trigger: null,
        }).catch(() => {});
      }
    });
  }, [hazards, userLocation, notifications, alertRadiusMeters]);

  useEffect(() => {
    if (!queryCenter) {
      setSearchedAreaWeather(null);
      setLoadingSearchedAreaWeather(false);
      return;
    }

    let isActive = true;

    const loadSearchedAreaWeather = async () => {
      setLoadingSearchedAreaWeather(true);

      try {
        const weatherData = await fetchAreaWeather(
          queryCenter.lat,
          queryCenter.lng,
        );

        if (!isActive) {
          return;
        }

        setSearchedAreaWeather(weatherData);
      } catch {
        if (!isActive) {
          return;
        }

        setSearchedAreaWeather(null);
      } finally {
        if (isActive) {
          setLoadingSearchedAreaWeather(false);
        }
      }
    };

    loadSearchedAreaWeather();

    return () => {
      isActive = false;
    };
  }, [queryCenter?.lat, queryCenter?.lng, weatherRefreshKey]);

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
      ["hazards", centerLat, centerLng, alertRadiusMeters],
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
    setSearchedAreaSummary(null);
    setSearchedAreaWeather(null);
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
    <View style={styles.container}>
      <MapViewWrapper
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapPadding={{
          top: insets.top + 72,
          bottom: insets.bottom + 310,
          left: 0,
          right: 0,
        }}
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
        {searchPin && (
          <Marker
            coordinate={{ latitude: searchPin.lat, longitude: searchPin.lng }}
            title={searchPin.label}
            pinColor="#1A9E8F"
          />
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
