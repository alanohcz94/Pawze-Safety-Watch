import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
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
    paddingHorizontal: 20,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  photo: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stats: {
    gap: 10,
    marginBottom: 20,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navigateBtn: {
    backgroundColor: Colors.primary,
  },
  photoBtn: {
    backgroundColor: Colors.primaryLight,
  },
  actionBtnTextLight: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.success,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  tooFarText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  fullPhotoContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  closePhotoBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullPhoto: {
    width: "100%",
    height: "80%",
  },
  promptOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    paddingHorizontal: 24,
  },
  promptSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  promptTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  promptSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  promptActions: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  promptActionBtn: {
    alignItems: "center",
    gap: 8,
  },
  promptActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  promptActionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  skipPhotoBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipPhotoText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
