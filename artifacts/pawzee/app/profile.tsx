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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import {
  deleteProfileAccount,
  fetchProfileStats,
  updateProfileImage,
  uploadPhoto,
  type ProfileStats,
} from "@/lib/api";
import { prepareImage } from "@/lib/images";
import { styles } from "./profileStyleSheet";

const EMPTY_STATS: ProfileStats = {
  hazardsReported: 0,
  hazardsConfirmed: 0,
  totalSteps: 0,
  weeklySteps: 0,
};

function getDisplayName(
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null,
  isGuest: boolean,
): string {
  if (isGuest) {
    return "Guest Pawzer";
  }

  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) {
    return fullName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Pawzer";
}

function buildBadges(stats: ProfileStats) {
  return [
    {
      key: "first-report",
      label: "First Report",
      icon: "flag-outline" as const,
      earned: stats.hazardsReported > 0,
    },
    {
      key: "first-confirmation",
      label: "First Confirmation",
      icon: "checkmark-circle-outline" as const,
      earned: stats.hazardsConfirmed > 0,
    },
    {
      key: "walker",
      label: "Walker",
      icon: "walk-outline" as const,
      earned: stats.totalSteps >= 5000,
    },
    {
      key: "protector",
      label: "Protector",
      icon: "shield-checkmark-outline" as const,
      earned: stats.hazardsConfirmed >= 5,
    },
    {
      key: "early-supporter",
      label: "Early Supporter",
      icon: "sparkles-outline" as const,
      earned: true,
    },
  ];
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    user,
    isGuest,
    isLoading: authLoading,
    login,
    logout,
    refreshUser,
  } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busyAction, setBusyAction] = useState<"logout" | "delete" | null>(
    null,
  );
  const isLoggedIn = !!user && !isGuest;

  const {
    data: stats = EMPTY_STATS,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: fetchProfileStats,
    enabled: !!user,
  });

  const badges = buildBadges(stats);
  const displayName = getDisplayName(user, isGuest);

  const handleImageSelection = async (source: "camera" | "library") => {
    try {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Camera permission is needed to take a profile photo.",
          );
          return;
        }
      } else if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Photo library permission is needed to choose a profile photo.",
          );
          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              quality: 1,
              allowsEditing: true,
              aspect: [1, 1],
            })
          : await ImagePicker.launchImageLibraryAsync({
              quality: 1,
              allowsEditing: true,
              aspect: [1, 1],
            });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setUploadingPhoto(true);
      const preparedImageUri = await prepareImage(result.assets[0].uri);
      const photoUrl = await uploadPhoto(preparedImageUri);
      await updateProfileImage(photoUrl);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.message || "We could not update your profile picture just now.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditPicture = () => {
    if (Platform.OS === "web") {
      void handleImageSelection("library");
      return;
    }

    Alert.alert("Edit Picture", "Choose how you want to add your dog photo.", [
      {
        text: "Take Photo",
        onPress: () => {
          void handleImageSelection("camera");
        },
      },
      {
        text: "From Gallery",
        onPress: () => {
          void handleImageSelection("library");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleLogout = async () => {
    if (!isLoggedIn) {
      return;
    }

    try {
      setBusyAction("logout");
      await logout();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This removes your Pawze user data, keeps hazard reports anonymized, and returns you to guest mode. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyAction("delete");
              await deleteProfileAccount();
              await logout();
              await queryClient.invalidateQueries({ queryKey: ["profile"] });
            } catch (err: any) {
              Alert.alert(
                "Delete Failed",
                err?.message || "We could not delete your Pawze account.",
              );
            } finally {
              setBusyAction(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) },
      ]}
    >
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 16 },
        ]}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons
                  name={isGuest ? "paw-outline" : "dog-side"}
                  size={52}
                  color={Colors.primary}
                />
              </View>
            )}
          </View>

          <View style={styles.badgePill}>
            <Ionicons name="ribbon-outline" size={16} color={Colors.accent} />
            <Text style={styles.badgePillText}>
              {isGuest ? "Guest Badge" : "Linked Pawzer"}
            </Text>
          </View>

          <Text style={styles.profileName}>{displayName}</Text>
          {!!user?.email && !isGuest && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}

          {!isGuest && (
            <Pressable
              style={styles.editPictureBtn}
              onPress={handleEditPicture}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={Colors.primary}
                />
              )}
              <Text style={styles.editPictureText}>
                {uploadingPhoto ? "Uploading..." : "Edit Picture"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.sectionSubtitle}>
            Simple MVP badges based on your Pawze activity so far.
          </Text>

          <View style={styles.badgeGrid}>
            {badges.map((badge) => (
              <View
                key={badge.key}
                style={[
                  styles.badgeItem,
                  badge.earned && styles.badgeItemEarned,
                ]}
              >
                <View style={styles.badgeIconWrap}>
                  <Ionicons
                    name={badge.icon}
                    size={18}
                    color={badge.earned ? Colors.primary : Colors.textSecondary}
                  />
                </View>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
                <Text style={styles.badgeStatus}>
                  {badge.earned ? "Unlocked" : "Keep going"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Records</Text>
          <Text style={styles.sectionSubtitle}>
            Hazards come from live Pawze data. Step counts stay at zero until a
            step source is added.
          </Text>

          <View style={styles.statGrid}>
            {[
              { label: "Hazard Reported", value: stats.hazardsReported },
              { label: "Hazard Confirmed", value: stats.hazardsConfirmed },
              { label: "Total Steps", value: stats.totalSteps },
              { label: "Weekly Steps", value: stats.weeklySteps },
            ].map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {(isLoading || authLoading) && (
            <Text style={styles.helperText}>Loading your activity...</Text>
          )}
          {error instanceof Error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}
        </View>

        {isGuest && (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={login}
          >
            <Ionicons name="link-outline" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>Link Account</Text>
          </Pressable>
        )}

        {!isGuest && isLoggedIn && (
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={handleLogout}
            disabled={busyAction === "logout"}
          >
            {busyAction === "logout" ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons name="log-out-outline" size={18} color={Colors.text} />
            )}
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={handleDeleteAccount}
          disabled={busyAction === "delete"}
        >
          {busyAction === "delete" ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          )}
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
