import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { styles } from "./componentStyleSheet/StyleSheetProfileMenu";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
  const { user, isAuthenticated, isGuest, login, loginAsGuest, logout } = useAuth();

  const displayName = isGuest
    ? "Guest Pawzer"
    : `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.email ||
      "Pawzer";

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleLogin = () => {
    login();
    onClose();
  };

  const handleGuest = () => {
    loginAsGuest();
    onClose();
  };

  const handleGuestReset = () => {
    loginAsGuest();
    onClose();
  };

  const handleUpgradeToReplit = () => {
    login();
    onClose();
  };

  const handleProfile = () => {
    onClose();
    router.push("/profile" as never);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.menu}>
          {isAuthenticated && user ? (
            <>
              <View style={styles.profileSection}>
                {!isGuest && user.profileImageUrl ? (
                  <Image
                    source={{ uri: user.profileImageUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name={isGuest ? "person-outline" : "person"}
                      size={24}
                      color={Colors.textTertiary}
                    />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.name}>{displayName}</Text>
                  {!isGuest && user.email && (
                    <Text style={styles.email}>{user.email}</Text>
                  )}
                  {isGuest && (
                    <Text style={styles.guestLabel}>Browsing as guest</Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <Pressable style={styles.menuItem} onPress={handleProfile}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={Colors.text}
                />
                <Text style={styles.menuItemText}>Profile</Text>
              </Pressable>

              {isGuest && (
                <Pressable style={styles.menuItem} onPress={handleUpgradeToReplit}>
                  <Feather name="log-in" size={20} color={Colors.primary} />
                  <Text style={[styles.menuItemText, { color: Colors.primary }]}>
                    Link Replit Account
                  </Text>
                </Pressable>
              )}

              <Pressable style={styles.menuItem} onPress={handleLogout}>
                <Feather
                  name={isGuest ? "refresh-cw" : "log-out"}
                  size={20}
                  color={isGuest ? Colors.textSecondary : Colors.danger}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    !isGuest && { color: Colors.danger },
                  ]}
                >
                  Logout
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.authActions}>
              <Pressable style={styles.loginBtn} onPress={handleLogin}>
                <Feather name="log-in" size={20} color="#FFF" />
                <Text style={styles.loginBtnText}>Log In with Replit</Text>
              </Pressable>

              <Pressable style={styles.guestBtn} onPress={handleGuest}>
                <Ionicons name="person-outline" size={20} color={Colors.primary} />
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

