import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { haversineDistance } from "@/lib/hazards";

interface VetClinic {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
}

interface EmergencyVetSheetProps {
  visible: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
}

export function EmergencyVetSheet({
  visible,
  onClose,
  userLat,
  userLng,
}: EmergencyVetSheetProps) {
  const [loading, setLoading] = useState(false);
  const [vets, setVets] = useState<VetClinic[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  useEffect(() => {
    if (visible && !searchDone) {
      searchNearbyVets();
    }
  }, [visible]);

  const searchNearbyVets = async () => {
    setLoading(true);
    setVets([]);

    const searchQueries = [
      "emergency veterinary clinic",
      "24 hour vet hospital",
      "animal emergency center",
      "veterinary emergency",
      "pet emergency hospital",
    ];

    const centerLat = userLat ?? 37.7749;
    const centerLng = userLng ?? -122.4194;

    const results: VetClinic[] = [];
    const seenNames = new Set<string>();

    for (const query of searchQueries) {
      try {
        const geocoded = await Location.geocodeAsync(
          `${query} near ${centerLat.toFixed(3)},${centerLng.toFixed(3)}`,
        );

        for (let i = 0; i < Math.min(geocoded.length, 2); i++) {
          const g = geocoded[i];
          const dist = haversineDistance(centerLat, centerLng, g.latitude, g.longitude);
          if (dist > 50000) continue;

          let name = query.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          let address = `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}`;

          try {
            const reverse = await Location.reverseGeocodeAsync({
              latitude: g.latitude,
              longitude: g.longitude,
            });
            if (reverse.length > 0) {
              const r = reverse[0];
              if (r.name && r.name !== address) name = r.name;
              const parts = [r.street, r.city, r.region].filter(Boolean);
              if (parts.length > 0) address = parts.join(", ");
            }
          } catch {}

          if (seenNames.has(name)) continue;
          seenNames.add(name);

          results.push({
            id: `${g.latitude}-${g.longitude}-${i}`,
            name,
            address,
            lat: g.latitude,
            lng: g.longitude,
            distance: Math.round(dist),
          });
        }
      } catch {}
    }

    results.sort((a, b) => a.distance - b.distance);
    setVets(results.slice(0, 8));
    setLoading(false);
    setSearchDone(true);
  };

  const handleNavigate = (vet: VetClinic) => {
    const url = Platform.select({
      ios: `maps:?daddr=${vet.lat},${vet.lng}`,
      android: `google.navigation:q=${vet.lat},${vet.lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`,
    });
    Linking.openURL(url);
  };

  const handleSearchMaps = () => {
    const lat = userLat ?? 37.7749;
    const lng = userLng ?? -122.4194;
    const url = Platform.select({
      ios: `maps:?q=emergency+vet&near=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=emergency+vet`,
      default: `https://www.google.com/maps/search/emergency+vet/@${lat},${lng},14z`,
    });
    Linking.openURL(url);
  };

  const renderVet = ({ item }: { item: VetClinic }) => (
    <View style={styles.vetCard}>
      <View style={styles.vetIconContainer}>
        <MaterialCommunityIcons name="hospital-building" size={24} color={Colors.accent} />
      </View>
      <View style={styles.vetInfo}>
        <Text style={styles.vetName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.vetAddress} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.vetDistance}>
          {item.distance < 1000
            ? `${item.distance}m away`
            : `${(item.distance / 1000).toFixed(1)}km away`}
        </Text>
      </View>
      <Pressable
        style={[styles.vetActionBtn, styles.navBtn]}
        onPress={() => handleNavigate(item)}
      >
        <Ionicons name="navigate" size={18} color={Colors.primary} />
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <View style={styles.emergencyBadge}>
              <MaterialCommunityIcons name="hospital-building" size={20} color="#FFF" />
            </View>
            <Text style={styles.sheetTitle}>Emergency Vet</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.sheetSubtitle}>Nearest emergency veterinary clinics</Text>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loaderText}>Searching nearby clinics...</Text>
            </View>
          ) : vets.length > 0 ? (
            <FlatList
              data={vets}
              keyExtractor={(item) => item.id}
              renderItem={renderVet}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <Pressable style={styles.searchMapsBtn} onPress={handleSearchMaps}>
                  <Ionicons name="map-outline" size={18} color={Colors.primary} />
                  <Text style={styles.searchMapsText}>Search in Maps app</Text>
                </Pressable>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map-search" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No clinics found nearby</Text>
              <Pressable style={styles.searchMapsBtn} onPress={handleSearchMaps}>
                <Ionicons name="map-outline" size={18} color={Colors.primary} />
                <Text style={styles.searchMapsText}>Search in Maps app</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  emergencyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  loaderContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  vetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  vetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  vetAddress: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vetDistance: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    marginTop: 2,
  },
  vetActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtn: {
    backgroundColor: Colors.primaryLight,
  },
  searchMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  searchMapsText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
