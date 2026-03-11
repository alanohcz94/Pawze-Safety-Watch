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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { fetchNearbyVets, type VetClinic } from "@/lib/api";
import { haversineDistance } from "@/lib/hazards";

const SINGAPORE_ER_VETS: VetClinic[] = [
  {
    id: "sg-er-1",
    name: "Animal Recovery Veterinary Referral Centre",
    address: "520 Balestier Road, Singapore",
    phone: "+6562528066",
    website: null,
    lat: 1.3278,
    lng: 103.8480,
    distance: 0,
    emergency: true,
  },
  {
    id: "sg-er-2",
    name: "Veterinary Emergency Service (VES)",
    address: "59 Sungei Tengah Road, Blk 5, Singapore",
    phone: "+6567660993",
    website: null,
    lat: 1.3684,
    lng: 103.7198,
    distance: 0,
    emergency: true,
  },
  {
    id: "sg-er-3",
    name: "Companion Animal Surgery & Emergency Centre",
    address: "6 Jalan Lembah Kallang, Singapore",
    phone: "+6565060016",
    website: null,
    lat: 1.3118,
    lng: 103.8688,
    distance: 0,
    emergency: true,
  },
];

function isInSingapore(lat: number, lng: number): boolean {
  return lat >= 1.15 && lat <= 1.47 && lng >= 103.6 && lng <= 104.1;
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

    const lat = userLat ?? 37.7749;
    const lng = userLng ?? -122.4194;

    try {
      let results = await fetchNearbyVets(lat, lng, 15000);

      if (isInSingapore(lat, lng)) {
        const existingIds = new Set(results.map((v) => v.id));
        const fallbacks = SINGAPORE_ER_VETS
          .filter((v) => !existingIds.has(v.id))
          .map((v) => ({
            ...v,
            distance: Math.round(haversineDistance(lat, lng, v.lat, v.lng)),
          }));
        results = [...results, ...fallbacks];
        results.sort((a, b) => a.distance - b.distance);
      }

      setVets(results);
    } catch {
      if (isInSingapore(lat, lng)) {
        const fallbacks = SINGAPORE_ER_VETS.map((v) => ({
          ...v,
          distance: Math.round(
            haversineDistance(lat, lng, v.lat, v.lng),
          ),
        }));
        fallbacks.sort((a, b) => a.distance - b.distance);
        setVets(fallbacks);
      } else {
        setVets([]);
      }
    }

    setLoading(false);
    setSearchDone(true);
  };

  const handleCall = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${cleaned}`);
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
        <View style={styles.vetNameRow}>
          <Text style={styles.vetName} numberOfLines={1}>{item.name}</Text>
          {item.emergency && (
            <View style={styles.emergencyTag}>
              <Text style={styles.emergencyTagText}>24h</Text>
            </View>
          )}
        </View>
        <Text style={styles.vetAddress} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.vetDistance}>
          {item.distance < 1000
            ? `${item.distance}m away`
            : `${(item.distance / 1000).toFixed(1)}km away`}
        </Text>
      </View>
      <View style={styles.vetActions}>
        {item.phone ? (
          <Pressable
            style={[styles.vetActionBtn, styles.callBtn]}
            onPress={() => handleCall(item.phone!)}
          >
            <Ionicons name="call" size={16} color={Colors.success} />
          </Pressable>
        ) : (
          <View style={[styles.vetActionBtn, styles.callBtnDisabled]}>
            <Ionicons name="call" size={16} color={Colors.textTertiary} />
          </View>
        )}
        <Pressable
          style={[styles.vetActionBtn, styles.navBtn]}
          onPress={() => handleNavigate(item)}
        >
          <Ionicons name="navigate" size={16} color={Colors.primary} />
        </Pressable>
      </View>
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

          <Text style={styles.sheetSubtitle}>Nearest veterinary clinics from OpenStreetMap</Text>

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
                  <Text style={styles.searchMapsText}>Open in Maps app</Text>
                </Pressable>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map-search" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No clinics found nearby</Text>
              <Text style={styles.emptySubtext}>Try searching in your Maps app instead</Text>
              <Pressable style={styles.searchMapsBtn} onPress={handleSearchMaps}>
                <Ionicons name="map-outline" size={18} color={Colors.primary} />
                <Text style={styles.searchMapsText}>Open in Maps app</Text>
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
  vetNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vetName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flexShrink: 1,
  },
  emergencyTag: {
    backgroundColor: Colors.accent,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  emergencyTagText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
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
  vetActions: {
    flexDirection: "row",
    gap: 6,
  },
  vetActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    backgroundColor: "#E8F8F0",
  },
  callBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.5,
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
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
