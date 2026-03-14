import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
  const { user, isAuthenticated, isGuest, login, loginAsGuest, logout } = useAuth();

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

  const handleUpgradeToReplit = () => {
    login();
    onClose();
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
                  <Text style={styles.name}>
                    {isGuest ? "Guest User" : `${user.firstName || "User"} ${user.lastName || ""}`}
                  </Text>
                  {!isGuest && user.email && (
                    <Text style={styles.email}>{user.email}</Text>
                  )}
                  {isGuest && (
                    <Text style={styles.guestLabel}>Browsing as guest</Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {isGuest && (
                <Pressable style={styles.menuItem} onPress={handleUpgradeToReplit}>
                  <Feather name="log-in" size={20} color={Colors.primary} />
                  <Text style={[styles.menuItemText, { color: Colors.primary }]}>
                    Sign In with Replit
                  </Text>
                </Pressable>
              )}

              <Pressable style={styles.menuItem} onPress={handleLogout}>
                <Feather name="log-out" size={20} color={Colors.danger} />
                <Text style={[styles.menuItemText, { color: Colors.danger }]}>
                  {isGuest ? "Sign Out" : "Log Out"}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  menu: {
    position: "absolute",
    top: 100,
    left: 16,
    width: 280,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  email: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  guestLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  authActions: {
    gap: 10,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  loginBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  guestBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
