import React, { useState, useEffect } from "react";
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
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
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
import { confirmHazard, uploadPhoto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import styles from "./componentStyleSheets/HazardDetailSheetStyleSheet";

type SheetView = "sheet" | "photo" | "confirmPrompt";

interface HazardDetailSheetProps {
  hazard: HazardItem | null;
  visible: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
  onConfirmed: () => void;
}

export function HazardDetailSheet({
  hazard,
  visible,
  onClose,
  userLat,
  userLng,
  onConfirmed,
}: HazardDetailSheetProps) {
  const { isAuthenticated, login } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [currentView, setCurrentView] = useState<SheetView>("sheet");

  useEffect(() => {
    if (visible) {
      setCurrentView("sheet");
      setConfirming(false);
    }
  }, [visible]);

  if (!hazard) return null;

  const config = HAZARD_CONFIGS[hazard.category as HazardCategory] || HAZARD_CONFIGS.other;
  const distance =
    userLat != null && userLng != null
      ? haversineDistance(userLat, userLng, hazard.lat, hazard.lng)
      : null;

  const canConfirm = distance != null && distance <= 10;

  const handleConfirmPress = () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please log in to confirm hazards.", [
        { text: "Cancel" },
        { text: "Log In", onPress: login },
      ]);
      return;
    }
    setCurrentView("confirmPrompt");
  };

  const doConfirm = async (photoUrl?: string) => {
    if (userLat == null || userLng == null) return;
    setConfirming(true);
    setCurrentView("sheet");
    try {
      await confirmHazard(hazard.id, userLat, userLng, photoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConfirmed();
      onClose();
    } catch (err: any) {
      Alert.alert("Cannot Confirm", err.message || "Failed to confirm hazard");
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmWithPhoto = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera permission is needed to take photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled && result.assets[0]) {
        setCurrentView("sheet");
        setConfirming(true);
        try {
          const url = await uploadPhoto(result.assets[0].uri);
          await doConfirm(url);
        } catch {
          await doConfirm();
        }
      }
    } catch {
      await doConfirm();
    }
  };

  const handleConfirmSkipPhoto = () => {
    doConfirm();
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
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              Reported {formatTimeAgo(hazard.reportedAt)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {hazard.confirmationCount} confirmation{hazard.confirmationCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="timer-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              Expires in {formatTimeRemaining(hazard.expiresAt)}
            </Text>
          </View>
          {distance != null && (
            <View style={styles.stat}>
              <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
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
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>View Photo</Text>
            </Pressable>
          )}
        </View>

        {canConfirm && (
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
        )}

        {distance != null && !canConfirm && (
          <Text style={styles.tooFarText}>
            Move within 10m to confirm this hazard
          </Text>
        )}
      </View>
    </View>
  );

  const renderPhoto = () => (
    <View style={styles.fullPhotoContainer}>
      <Pressable style={styles.closePhotoBtn} onPress={() => setCurrentView("sheet")}>
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

  const renderConfirmPrompt = () => (
    <View style={styles.promptOverlay}>
      <View style={styles.promptSheet}>
        <Text style={styles.promptTitle}>Add a confirmation photo?</Text>
        <Text style={styles.promptSubtitle}>
          Optionally take a photo to help verify this hazard
        </Text>

        <View style={styles.promptActions}>
          <Pressable
            style={styles.promptActionBtn}
            onPress={() => handleConfirmWithPhoto(true)}
          >
            <View style={[styles.promptActionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="camera" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.promptActionLabel}>Camera</Text>
          </Pressable>
          <Pressable
            style={styles.promptActionBtn}
            onPress={() => handleConfirmWithPhoto(false)}
          >
            <View style={[styles.promptActionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="images" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.promptActionLabel}>Gallery</Text>
          </Pressable>
        </View>

        <Pressable style={styles.skipPhotoBtn} onPress={handleConfirmSkipPhoto}>
          <Text style={styles.skipPhotoText}>Skip — confirm without photo</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={currentView === "sheet" ? "slide" : "fade"}
      transparent={currentView !== "photo"}
      onRequestClose={currentView === "sheet" ? handleClose : () => setCurrentView("sheet")}
    >
      {currentView === "sheet" && renderSheet()}
      {currentView === "photo" && renderPhoto()}
      {currentView === "confirmPrompt" && renderConfirmPrompt()}
    </Modal>
  );
}
