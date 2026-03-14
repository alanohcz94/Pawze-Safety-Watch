import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { fetchNearbyVets, type VetClinic } from "@/lib/api";
import { haversineDistance } from "@/lib/hazards";
import { SINGAPORE_ER_VETS } from "@/constants/constantVariable";
import { styles } from "./componentStyleSheet/StyleSheetEmergencyVetSheet";

const VET_SEARCH_RADIUS_METERS = 8000;

function isInSingapore(lat: number, lng: number): boolean {
  return lat >= 1.15 && lat <= 1.47 && lng >= 103.6 && lng <= 104.1;
}

function getSingaporeEmergencyFallbacks(lat: number, lng: number): VetClinic[] {
  return SINGAPORE_ER_VETS.map((vet) => ({
    ...vet,
    distance: Math.round(haversineDistance(lat, lng, vet.lat, vet.lng)),
  }))
    .filter((vet) => vet.distance <= VET_SEARCH_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance);
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
      let results = await fetchNearbyVets(lat, lng, VET_SEARCH_RADIUS_METERS);

      if (isInSingapore(lat, lng)) {
        const existingIds = new Set(results.map((v) => v.id));
        const fallbacks = getSingaporeEmergencyFallbacks(lat, lng).filter(
          (v) => !existingIds.has(v.id),
        );
        results = [...results, ...fallbacks];
        results.sort((a, b) => a.distance - b.distance);
      }

      setVets(results);
    } catch {
      if (isInSingapore(lat, lng)) {
        setVets(getSingaporeEmergencyFallbacks(lat, lng));
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
    const url = `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;
    Linking.openURL(url);
  };

  const handleSearchMaps = () => {
    const lat = userLat ?? 37.7749;
    const lng = userLng ?? -122.4194;
    const url = `https://www.google.com/maps/search/emergency+vet/@${lat},${lng},14z`;
    Linking.openURL(url);
  };

  const renderVet = ({ item }: { item: VetClinic }) => (
    <View style={styles.vetCard}>
      <View style={styles.vetIconContainer}>
        <MaterialCommunityIcons
          name="hospital-building"
          size={24}
          color={Colors.accent}
        />
      </View>
      <View style={styles.vetInfo}>
        <View style={styles.vetNameRow}>
          <Text style={styles.vetName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.emergency && (
            <View style={styles.emergencyTag}>
              <Text style={styles.emergencyTagText}>24h</Text>
            </View>
          )}
        </View>
        <Text style={styles.vetAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.vetDistance}>
          {item.distance < 1000
            ? `${item.distance}m away`
            : `${(item.distance / 1000).toFixed(1)}km away`}
        </Text>
      </View>
      <View style={styles.vetActions}>
        <Pressable
          style={[
            styles.vetActionBtn,
            styles.callBtn,
            !item.phone && styles.callBtnDisabled,
          ]}
          onPress={() =>
            item.phone
              ? handleCall(item.phone)
              : Alert.alert(
                  "No Phone",
                  "No phone number available for this clinic.",
                )
          }
        >
          <Ionicons
            name="call"
            size={16}
            color={item.phone ? Colors.success : Colors.textTertiary}
          />
        </Pressable>
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <View style={styles.emergencyBadge}>
              <MaterialCommunityIcons
                name="hospital-building"
                size={20}
                color="#FFF"
              />
            </View>
            <Text style={styles.sheetTitle}>Emergency Vet</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.sheetSubtitle}>
            Nearest veterinary clinics from OpenStreetMap
          </Text>

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
                <Pressable
                  style={styles.searchMapsBtn}
                  onPress={handleSearchMaps}
                >
                  <Ionicons
                    name="map-outline"
                    size={18}
                    color={Colors.primary}
                  />
                  <Text style={styles.searchMapsText}>Open in Maps app</Text>
                </Pressable>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="map-search"
                size={48}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyText}>No clinics found nearby</Text>
              <Text style={styles.emptySubtext}>
                Try searching in your Maps app instead
              </Text>
              <Pressable
                style={styles.searchMapsBtn}
                onPress={handleSearchMaps}
              >
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
