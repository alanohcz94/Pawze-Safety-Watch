import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { HazardIcon } from "./HazardIcon";
import {
  HAZARD_CONFIGS,
  formatTimeAgo,
  formatTimeRemaining,
  formatDistance,
  type HazardCategory,
} from "@/lib/hazards";
import type { HazardItem } from "@/lib/api";
import { confirmHazard, updateHazardPhoto, uploadPhoto } from "@/lib/api";
import { prepareImage } from "@/lib/images";
import { useAuth } from "@/lib/auth";
import {
  buildHazardNavigationUrl,
  getHazardDetailSheetState,
} from "../lib/hazardDetailSheet";
import { invalidateHazardQueries } from "@/lib/queryKeys";
import { styles } from "./componentStyleSheet/StyleSheetHazardDetailSheet";

type SheetView = "sheet" | "photo";
type PhotoSource = "camera" | "library";

const IMAGE_PICKER_OPTIONS = {
  quality: 0.7,
  allowsEditing: true,
  aspect: [4, 3] as [number, number],
};

interface HazardDetailSheetProps {
  hazard: HazardItem | null;
  visible: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
  onHazardUpdated: (hazard: HazardItem) => void;
}

export function HazardDetailSheet({
  hazard,
  visible,
  onClose,
  userLat,
  userLng,
  onHazardUpdated,
}: HazardDetailSheetProps) {
  const { isAuthenticated, login } = useAuth();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [currentView, setCurrentView] = useState<SheetView>("sheet");

  useEffect(() => {
    if (visible) {
      setCurrentView("sheet");
      setConfirming(false);
      setUpdatingPhoto(false);
    }
  }, [visible]);

  if (!hazard) return null;

  const config =
    HAZARD_CONFIGS[hazard.category as HazardCategory] || HAZARD_CONFIGS.other;
  const sheetState = getHazardDetailSheetState({
    hazard,
    userLat,
    userLng,
  });
  const { alreadyConfirmed, distance } = sheetState;

  const handleConfirmPress = async () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please log in to confirm hazards.", [
        { text: "Cancel" },
        { text: "Log In", onPress: login },
      ]);
      return;
    }

    if (alreadyConfirmed) {
      return;
    }

    if (userLat == null || userLng == null) {
      Alert.alert(
        "Location Required",
        "Your current location is needed to confirm this hazard.",
      );
      return;
    }

    setConfirming(true);
    try {
      const updated = await confirmHazard(hazard.id, userLat, userLng);
      const nextHazard = {
        ...hazard,
        ...updated,
        userHasConfirmed: true,
      };
      onHazardUpdated(nextHazard);
      await invalidateHazardQueries(queryClient);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Hazard Confirmed", "This hazard has been confirmed.");
    } catch (err: any) {
      Alert.alert("Cannot Confirm", err.message || "Failed to confirm hazard");
    } finally {
      setConfirming(false);
    }
  };

  const choosePhotoSource = () =>
    new Promise<PhotoSource | null>((resolve) => {
      let settled = false;
      const finish = (source: PhotoSource | null) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(source);
      };

      Alert.alert(
        hazard.photoUrl ? "Update Photo" : "Add Photo",
        "Choose a photo source.",
        [
          { text: "Take Photo", onPress: () => finish("camera") },
          { text: "From Gallery", onPress: () => finish("library") },
          { text: "Cancel", style: "cancel", onPress: () => finish(null) },
        ],
        {
          cancelable: true,
          onDismiss: () => finish(null),
        },
      );
    });

  const pickPhoto = async (source: PhotoSource) => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos.",
        );
        return null;
      }

      return ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
    }

    return ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
  };

  const handlePhotoAction = async () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please log in to update hazard photos.", [
        { text: "Cancel" },
        { text: "Log In", onPress: login },
      ]);
      return;
    }

    if (!alreadyConfirmed) {
      return;
    }

    const source = await choosePhotoSource();
    if (!source) {
      return;
    }

    const result = await pickPhoto(source);

    if (!result || result.canceled || !result.assets[0]) {
      return;
    }

    setUpdatingPhoto(true);
    try {
      const hadPhoto = Boolean(hazard.photoUrl);
      const prepared = await prepareImage(result.assets[0].uri);
      const photoUrl = await uploadPhoto(prepared);
      const updated = await updateHazardPhoto(hazard.id, photoUrl);
      const nextHazard = {
        ...hazard,
        ...updated,
        userHasConfirmed: true,
      };
      onHazardUpdated(nextHazard);
      await invalidateHazardQueries(queryClient);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        hadPhoto ? "Photo Updated" : "Photo Added",
        hadPhoto
          ? "The hazard photo has been updated."
          : "A photo has been added to this hazard.",
      );
    } catch (err: any) {
      Alert.alert(
        "Photo Update Failed",
        err.message || "Failed to update the hazard photo.",
      );
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleNavigate = () => {
    Linking.openURL(buildHazardNavigationUrl(hazard.lat, hazard.lng));
  };

  const handleClose = () => {
    setCurrentView("sheet");
    onClose();
  };

  const renderSheet = () => (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />

        {sheetState.showPhotoPreview && (
          <View style={styles.photoCard}>
            <Pressable
              style={styles.photoPreviewBtn}
              onPress={() => setCurrentView("photo")}
            >
              <Image
                source={{ uri: hazard.photoUrl! }}
                style={styles.photo}
                contentFit="cover"
              />
              <View style={styles.photoPreviewHint}>
                <Ionicons name="expand-outline" size={16} color="#FFF" />
                <Text style={styles.photoPreviewHintText}>View Photo</Text>
              </View>
            </Pressable>

            {sheetState.showEditPhotoOverlay && (
              <Pressable
                style={[
                  styles.photoEditIconBtn,
                  updatingPhoto && styles.photoActionDisabled,
                ]}
                onPress={handlePhotoAction}
                disabled={updatingPhoto}
              >
                {updatingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                )}
              </Pressable>
            )}
          </View>
        )}

        {sheetState.showAddPhotoCard && (
          <Pressable
            style={[
              styles.photoPlaceholder,
              updatingPhoto && styles.photoActionDisabled,
            ]}
            onPress={handlePhotoAction}
            disabled={updatingPhoto}
          >
            {updatingPhoto ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <View style={styles.photoPlaceholderIcon}>
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.photoPlaceholderTitle}>
                  {sheetState.photoActionLabel}
                </Text>
                <Text style={styles.photoPlaceholderSubtitle}>
                  Take a photo or choose one from the gallery.
                </Text>
              </>
            )}
          </Pressable>
        )}

        <View style={styles.header}>
          <HazardIcon category={hazard.category as HazardCategory} size={44} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{config.label}</Text>
            {hazard.reportedByName && (
              <Text style={styles.subtitle}>
                Reported by {hazard.reportedByName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons
              name="time-outline"
              size={18}
              color={Colors.textSecondary}
            />
            <Text style={styles.statText}>
              Reported {formatTimeAgo(hazard.reportedAt)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="people-outline"
              size={18}
              color={Colors.textSecondary}
            />
            <Text style={styles.statText}>
              {hazard.confirmationCount} confirmation
              {hazard.confirmationCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="timer-outline"
              size={18}
              color={Colors.textSecondary}
            />
            <Text style={styles.statText}>
              Expires in {formatTimeRemaining(hazard.expiresAt)}
            </Text>
          </View>
          {distance != null && (
            <View style={styles.stat}>
              <Ionicons
                name="location-outline"
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.statText}>{formatDistance(distance)}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.navigateBtn]}
            onPress={handleNavigate}
          >
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={styles.actionBtnTextLight}>Navigate</Text>
          </Pressable>

          {sheetState.showViewPhotoButton && (
            <Pressable
              style={[styles.actionBtn, styles.photoBtn]}
              onPress={() => setCurrentView("photo")}
            >
              <Ionicons
                name="image-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.actionBtnText}>View Photo</Text>
            </Pressable>
          )}
        </View>

        {sheetState.showAlreadyConfirmedButton ? (
          <Pressable
            style={[styles.confirmBtn, styles.confirmBtnDisabled]}
            disabled
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.confirmBtnText}>Already Confirmed</Text>
          </Pressable>
        ) : sheetState.showConfirmButton ? (
          <Pressable
            style={[styles.confirmBtn, confirming && styles.confirmBtnDisabled]}
            onPress={handleConfirmPress}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.confirmBtnText}>Confirm Hazard</Text>
              </>
            )}
          </Pressable>
        ) : sheetState.showTooFarMessage ? (
          <Text style={styles.tooFarText}>
            Move within 10m to confirm this hazard
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderPhoto = () => (
    <View style={styles.fullPhotoContainer}>
      <Pressable
        style={styles.closePhotoBtn}
        onPress={() => setCurrentView("sheet")}
      >
        <Ionicons name="close" size={28} color="#FFF" />
      </Pressable>
      {hazard.photoUrl && (
        <Image
          source={{ uri: hazard.photoUrl }}
          style={styles.fullPhoto}
          contentFit="contain"
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={currentView === "sheet" ? "slide" : "fade"}
      transparent={currentView !== "photo"}
      onRequestClose={
        currentView === "sheet" ? handleClose : () => setCurrentView("sheet")
      }
    >
      {currentView === "sheet" && renderSheet()}
      {currentView === "photo" && renderPhoto()}
    </Modal>
  );
}
