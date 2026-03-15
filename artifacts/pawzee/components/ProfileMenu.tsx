import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Switch,
  ScrollView,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { styles } from "./componentStyleSheet/StyleSheetProfileMenu";

const RADIUS_OPTIONS = [1, 3, 5, 10, 15];

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isGuest, login, loginAsGuest, logout } = useAuth();
  const settings = useSettings();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

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

  const handleUpgradeToReplit = () => {
    login();
    onClose();
  };

  const handleProfile = () => {
    onClose();
    router.push("/profile" as never);
  };

  const handleSendSupport = () => {
    const subject = encodeURIComponent("Pawzee Support");
    const body = encodeURIComponent(supportMessage.trim());
    Linking.openURL(`mailto:supportPawject@gmail.com?subject=${subject}&body=${body}`);
    setSupportMessage("");
    setShowSupportForm(false);
  };

  const renderSupportFormModal = () => (
    <Modal
      visible={showSupportForm}
      animationType="fade"
      transparent
      onRequestClose={() => setShowSupportForm(false)}
    >
      <View style={styles.supportOverlay}>
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Get Support</Text>
          <Text style={styles.supportSubtitle}>
            Send feedback or report an issue to the Pawzee team.
          </Text>

          <TextInput
            style={styles.supportInput}
            placeholder="Describe your issue or feedback..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={supportMessage}
            onChangeText={setSupportMessage}
          />

          <View style={styles.supportActions}>
            <Pressable
              style={styles.supportCancelBtn}
              onPress={() => {
                setSupportMessage("");
                setShowSupportForm(false);
              }}
            >
              <Text style={styles.supportCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.supportSendBtn,
                !supportMessage.trim() && styles.supportSendBtnDisabled,
              ]}
              onPress={handleSendSupport}
              disabled={!supportMessage.trim()}
            >
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={styles.supportSendText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.drawer,
              { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.drawerContent,
                { paddingBottom: Math.max(insets.bottom, 20) + 16 },
              ]}
            >
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

                  <View style={styles.divider} />

                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => setSettingsOpen(!settingsOpen)}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Ionicons name="settings-outline" size={20} color={Colors.text} />
                      <Text style={styles.sectionHeaderText}>Settings</Text>
                    </View>
                    <Ionicons
                      name={settingsOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </Pressable>

                  {settingsOpen && (
                    <View style={styles.sectionBody}>
                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <Ionicons name="notifications-outline" size={18} color={Colors.text} />
                          <Text style={styles.settingLabel}>Notifications</Text>
                        </View>
                        <Switch
                          value={settings.notifications}
                          onValueChange={(v) => settings.updateSetting("notifications", v)}
                          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                          thumbColor={settings.notifications ? Colors.primary : Colors.textTertiary}
                        />
                      </View>

                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <Ionicons name="radio-outline" size={18} color={Colors.text} />
                          <Text style={styles.settingLabel}>Alert Radius</Text>
                        </View>
                      </View>
                      <View style={styles.radiusPills}>
                        {RADIUS_OPTIONS.map((km) => (
                          <Pressable
                            key={km}
                            style={[
                              styles.radiusPill,
                              settings.alertRadius === km && styles.radiusPillActive,
                            ]}
                            onPress={() => settings.updateSetting("alertRadius", km)}
                          >
                            <Text
                              style={[
                                styles.radiusPillText,
                                settings.alertRadius === km && styles.radiusPillTextActive,
                              ]}
                            >
                              {km} km
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <Ionicons name="mic-outline" size={18} color={Colors.textTertiary} />
                          <View>
                            <Text style={[styles.settingLabel, { color: Colors.textTertiary }]}>
                              Audio Report
                            </Text>
                            <Text style={styles.comingSoon}>Next Release</Text>
                          </View>
                        </View>
                        <Switch
                          value={false}
                          disabled
                          trackColor={{ false: Colors.border, true: Colors.border }}
                          thumbColor={Colors.textTertiary}
                        />
                      </View>

                      <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                          <Ionicons name="footsteps-outline" size={18} color={Colors.text} />
                          <Text style={styles.settingLabel}>Step Counter</Text>
                        </View>
                        <Switch
                          value={settings.stepCounter}
                          onValueChange={(v) => settings.updateSetting("stepCounter", v)}
                          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                          thumbColor={settings.stepCounter ? Colors.primary : Colors.textTertiary}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => setHelpOpen(!helpOpen)}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Ionicons name="help-circle-outline" size={20} color={Colors.text} />
                      <Text style={styles.sectionHeaderText}>Help & Feedback</Text>
                    </View>
                    <Ionicons
                      name={helpOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </Pressable>

                  {helpOpen && (
                    <View style={styles.sectionBody}>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => setShowSupportForm(true)}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
                        <Text style={[styles.menuItemText, { color: Colors.primary }]}>
                          Send Feedback
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() =>
                          Linking.openURL("mailto:supportPawject@gmail.com?subject=Pawzee%20Support")
                        }
                      >
                        <Ionicons name="mail-outline" size={18} color={Colors.text} />
                        <Text style={styles.menuItemText}>Email Support</Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={styles.divider} />

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
            </ScrollView>

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          <Pressable style={styles.backdrop} onPress={onClose} />
        </View>
      </Modal>

      {renderSupportFormModal()}
    </>
  );
}
