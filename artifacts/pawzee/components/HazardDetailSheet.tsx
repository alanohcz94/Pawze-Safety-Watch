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
import Colors from "@/constants/colors";
import { HazardIcon } from "./HazardIcon";
import {
  HAZARD_CONFIGS,
  formatTimeAgo,
  formatTimeRemaining,
  formatDistance,
  haversineDistance,
  type HazardCategory,
} from "@/lib/hazards";
import type { HazardItem } from "@/lib/api";
import { confirmHazard, updateHazardPhoto, uploadPhoto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { styles } from "./componentStyleSheet/StyleSheetHazardDetailSheet";

type SheetView = "sheet" | "photo";

interface HazardDetailSheetProps {
  hazard: HazardItem | null;
  visible: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
  onConfirmed: () => void;
  onHazardUpdated: (hazard: HazardItem) => void;
}

export function HazardDetailSheet({
  hazard,
  visible,
  onClose,
  userLat,
  userLng,
  onConfirmed,
  onHazardUpdated,
}: HazardDetailSheetProps) {
  const { isAuthenticated, login } = useAuth();
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
  const distance =
    userLat != null && userLng != null
      ? haversineDistance(userLat, userLng, hazard.lat, hazard.lng)
      : null;

  const canConfirm = distance != null && distance <= 10;
  const alreadyConfirmed = hazard.userHasConfirmed;

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
      };
      onHazardUpdated(nextHazard);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Hazard Confirmed", "This hazard has been confirmed.");
      onConfirmed();
    } catch (err: any) {
      Alert.alert("Cannot Confirm", err.message || "Failed to confirm hazard");
    } finally {
      setConfirming(false);
    }
  };

  const handleEditPhoto = async () => {
    if (!alreadyConfirmed) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setUpdatingPhoto(true);
    try {
      const photoUrl = await uploadPhoto(result.assets[0].uri);
      const updated = await updateHazardPhoto(hazard.id, photoUrl);
      const nextHazard = {
        ...hazard,
        ...updated,
      };
      onHazardUpdated(nextHazard);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        hazard.photoUrl ? "Photo Updated" : "Photo Added",
        hazard.photoUrl
          ? "The hazard photo has been updated."
          : "A photo has been added to this hazard.",
      );
      onConfirmed();
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
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hazard.lat},${hazard.lng}`;
    Linking.openURL(url);
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

        {hazard.photoUrl && (
          <Pressable onPress={() => setCurrentView("photo")}>
            <Image
              source={{ uri: hazard.photoUrl }}
              style={styles.photo}
              contentFit="cover"
            />
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

          {hazard.photoUrl && (
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

        {alreadyConfirmed && (
          <Pressable
            style={[
              styles.editPhotoBtn,
              updatingPhoto && styles.confirmBtnDisabled,
            ]}
            onPress={handleEditPhoto}
            disabled={updatingPhoto}
          >
            {updatingPhoto ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={hazard.photoUrl ? "create-outline" : "camera-outline"}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.editPhotoBtnText}>
                  {hazard.photoUrl ? "Edit Photo" : "Add Photo"}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {alreadyConfirmed ? (
          <Pressable
            style={[styles.confirmBtn, styles.confirmBtnDisabled]}
            disabled
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.confirmBtnText}>Already Confirmed</Text>
          </Pressable>
        ) : canConfirm ? (
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
        ) : distance != null ? (
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
