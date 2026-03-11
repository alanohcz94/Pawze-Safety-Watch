import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { HazardIcon } from "@/components/HazardIcon";
import { HAZARD_CATEGORIES, HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import { createHazard, uploadPhoto } from "@/lib/api";

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<HazardCategory | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCategorySelect = (category: HazardCategory) => {
    setSelectedCategory(category);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera permission is needed to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleFetchLocation = async () => {
    setFetchingLocation(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      let address = `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverseResults.length > 0) {
          const r = reverseResults[0];
          const parts = [r.street, r.city, r.region].filter(Boolean);
          if (parts.length > 0) address = parts.join(", ");
        }
      } catch {}

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        address,
      });
    } catch {
      Alert.alert("Location Error", "Could not get your current location. Please try again.");
    } finally {
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    if (step === 3 && !location) {
      handleFetchLocation();
    }
  }, [step]);

  const handleSubmit = async () => {
    if (!selectedCategory || !location) return;
    setSubmitting(true);

    try {
      let uploadedPhotoUrl: string | null = null;
      if (photoUri) {
        try {
          uploadedPhotoUrl = await uploadPhoto(photoUri);
        } catch {
          uploadedPhotoUrl = null;
        }
      }

      await createHazard({
        category: selectedCategory,
        lat: location.lat,
        lng: location.lng,
        photoUrl: uploadedPhotoUrl,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["hazards"] });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to report hazard. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const config = selectedCategory ? HAZARD_CONFIGS[selectedCategory] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Report Hazard</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.steps}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              s <= step && styles.stepDotActive,
              s === step && styles.stepDotCurrent,
            ]}
          />
        ))}
      </View>

      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>What did you find?</Text>
          <Text style={styles.stepSubtitle}>Select the type of hazard</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoryGrid}
          >
            {HAZARD_CATEGORIES.map((category) => {
              const c = HAZARD_CONFIGS[category];
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <HazardIcon category={category} size={40} />
                  <Text style={styles.categoryLabel}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Add a photo</Text>
          <Text style={styles.stepSubtitle}>Optional: Take or select a photo of the hazard</Text>

          {photoUri ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} contentFit="cover" />
              <Pressable
                style={styles.removePhotoBtn}
                onPress={() => setPhotoUri(null)}
              >
                <Ionicons name="close-circle" size={28} color="#FFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <Pressable style={styles.photoActionBtn} onPress={handleTakePhoto}>
                <View style={styles.photoActionIcon}>
                  <Ionicons name="camera" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.photoActionText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.photoActionBtn} onPress={handlePickPhoto}>
                <View style={styles.photoActionIcon}>
                  <Ionicons name="images" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.photoActionText}>From Gallery</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.navButtons}>
            <Pressable
              style={styles.skipBtn}
              onPress={() => setStep(3)}
            >
              <Text style={styles.skipBtnText}>
                {photoUri ? "Next" : "Skip"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </Pressable>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Confirm location</Text>
          <Text style={styles.stepSubtitle}>
            We'll pin this hazard at your current GPS position
          </Text>

          <View style={styles.locationCard}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={28} color={Colors.primary} />
            </View>

            {fetchingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.locationLoadingText}>Getting your location...</Text>
              </View>
            ) : location ? (
              <View style={styles.locationDetails}>
                <Text style={styles.locationAddress}>{location.address}</Text>
                <Text style={styles.locationCoords}>
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </Text>
              </View>
            ) : (
              <Text style={styles.locationError}>Could not determine location</Text>
            )}
          </View>

          {location && (
            <Pressable style={styles.refreshLocationBtn} onPress={handleFetchLocation}>
              <Ionicons name="refresh" size={18} color={Colors.primary} />
              <Text style={styles.refreshLocationText}>Refresh location</Text>
            </Pressable>
          )}

          <View style={styles.navButtons}>
            <Pressable
              style={[styles.nextBtn, !location && styles.nextBtnDisabled]}
              onPress={() => {
                if (location) setStep(4);
              }}
              disabled={!location}
            >
              <Text style={styles.nextBtnText}>Looks good</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </Pressable>
          </View>
        </View>
      )}

      {step === 4 && config && location && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Review & submit</Text>
          <Text style={styles.stepSubtitle}>
            Confirm everything looks correct before submitting
          </Text>

          <View style={styles.confirmCard}>
            <HazardIcon category={selectedCategory!} size={56} />
            <Text style={styles.confirmCategory}>{config.label}</Text>

            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={styles.confirmPhoto}
                contentFit="cover"
              />
            )}

            <View style={styles.confirmInfo}>
              <View style={styles.confirmInfoRow}>
                <Ionicons name="location" size={16} color={Colors.textSecondary} />
                <Text style={styles.confirmInfoText} numberOfLines={1}>
                  {location.address}
                </Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Ionicons name="camera-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.confirmInfoText}>
                  {photoUri ? "Photo attached" : "No photo"}
                </Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Ionicons name="timer-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.confirmInfoText}>
                  Expires in 10 days
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  steps: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primaryLight,
    width: 8,
  },
  stepDotCurrent: {
    backgroundColor: Colors.primary,
    width: 24,
    borderRadius: 4,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 40,
  },
  categoryItem: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  photoActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  photoActionIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  photoPreview: {
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 240,
    borderRadius: 16,
  },
  removePhotoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  navButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  skipBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  locationLoading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationLoadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  locationDetails: {
    flex: 1,
    gap: 4,
  },
  locationAddress: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  locationCoords: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  locationError: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.danger,
  },
  refreshLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  refreshLocationText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  confirmCategory: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  confirmPhoto: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  confirmInfo: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  confirmInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
});
