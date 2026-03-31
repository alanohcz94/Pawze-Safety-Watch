import React, { useState } from "react";
import {
  View,
  Text,
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
import { styles } from "./reportStyleSheet";
import Colors from "@/constants/colors";
import { HazardIcon } from "@/components/HazardIcon";
import {
  HAZARD_CATEGORIES,
  HAZARD_CONFIGS,
  type HazardCategory,
} from "@/lib/hazards";
import { createHazard, uploadPhoto } from "@/lib/api";
import { prepareImage } from "@/lib/images";
import { invalidateHazardQueries } from "@/lib/queryKeys";

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] =
    useState<HazardCategory | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCategorySelect = (category: HazardCategory) => {
    setSelectedCategory(category);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is needed to take photos.",
      );
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

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let uploadedPhotoUrl: string | null = null;
      if (photoUri) {
        try {
          const prepared = await prepareImage(photoUri);
          uploadedPhotoUrl = await uploadPhoto(prepared);
        } catch {
          uploadedPhotoUrl = null;
        }
      }

      await createHazard({
        category: selectedCategory,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        photoUrl: uploadedPhotoUrl,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await invalidateHazardQueries(queryClient);
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "Failed to report hazard. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const config = selectedCategory ? HAZARD_CONFIGS[selectedCategory] : null;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) },
      ]}
    >
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
        {[1, 2].map((s) => (
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
                    selectedCategory === category &&
                      styles.categoryItemSelected,
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

      {step === 2 && config && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Review & submit</Text>
          <Text style={styles.stepSubtitle}>
            Your current GPS location will be used as the hazard pin
          </Text>

          <View style={styles.confirmCard}>
            <HazardIcon category={selectedCategory!} size={56} />
            <Text style={styles.confirmCategory}>{config.label}</Text>
            {/* Add photo from gallery or camera */}
            <Text style={styles.stepSubtitle}>
              Optional: Take or select a photo of the hazard
            </Text>
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <Pressable
                  style={styles.removePhotoBtn}
                  onPress={() => setPhotoUri(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#FFF" />
                </Pressable>

                <View style={styles.photoPreviewActions}>
                  <Pressable
                    style={styles.photoPreviewActionBtn}
                    onPress={handleTakePhoto}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.photoPreviewActionText}>Retake</Text>
                  </Pressable>
                  <Pressable
                    style={styles.photoPreviewActionBtn}
                    onPress={handlePickPhoto}
                  >
                    <Ionicons
                      name="images-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.photoPreviewActionText}>
                      Choose Another
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.photoActions}>
                <Pressable
                  style={styles.photoActionBtn}
                  onPress={handleTakePhoto}
                >
                  <View style={styles.photoActionIcon}>
                    <Ionicons name="camera" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  style={styles.photoActionBtn}
                  onPress={handlePickPhoto}
                >
                  <View style={styles.photoActionIcon}>
                    <Ionicons name="images" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.photoActionText}>From Gallery</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.confirmInfo}>
              <View style={styles.confirmInfoRow}>
                <Ionicons
                  name="location"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.confirmInfoText} numberOfLines={1}>
                  Current GPS location
                </Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.confirmInfoText}>
                  {photoUri ? "Photo attached" : "No photo"}
                </Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Ionicons
                  name="timer-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.confirmInfoText}>
                  Expires in {config.expiryLabel}
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
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
