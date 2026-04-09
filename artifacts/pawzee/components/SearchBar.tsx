import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  Platform,
  Keyboard,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { createStyles } from "./componentStyleSheet/StyleSheetSearchBar";
import { useResponsive } from "@/lib/responsive";
import { fetchPlaceAutocomplete, fetchPlaceDetails } from "@/lib/api";

export interface SearchResult {
  label: string;
  latitude: number;
  longitude: number;
}

interface SearchBarProps {
  onSearch: (result: SearchResult) => void;
  placeholder?: string;
  displayText?: string;
  onRecenter?: () => void;
  recenterDisabled?: boolean;
}

interface GeoSuggestion {
  placeId: string;
  label: string;
}

function makeSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function SearchBar({
  onSearch,
  placeholder = "Search location...",
  displayText = "",
  onRecenter,
  recenterDisabled = false,
}: SearchBarProps) {
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r]);
  const insets = useSafeAreaInsets();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string>(makeSessionToken());

  const openOverlay = () => {
    sessionTokenRef.current = makeSessionToken();
    setOverlayVisible(true);
    setQuery("");
    setSuggestions([]);
  };

  const closeOverlay = () => {
    setOverlayVisible(false);
    setQuery("");
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const predictions = await fetchPlaceAutocomplete(text.trim(), sessionTokenRef.current);
      setSuggestions(
        predictions.map((p) => ({ placeId: p.placeId, label: p.description })),
      );
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  }, []);

  const handleTextChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 400);
  };

  const handleSelectSuggestion = useCallback(
    async (suggestion: GeoSuggestion) => {
      setLoading(true);
      try {
        const details = await fetchPlaceDetails(
          suggestion.placeId,
          sessionTokenRef.current,
          suggestion.label,
        );
        if (details) {
          onSearch({
            label: suggestion.label,
            latitude: details.lat,
            longitude: details.lng,
          });
          closeOverlay();
        }
      } catch {
        // ignore — user can retry
      }
      setLoading(false);
    },
    [onSearch],
  );

  const handleSubmit = async () => {
    if (!query.trim()) return;

    if (suggestions.length > 0) {
      await handleSelectSuggestion(suggestions[0]);
      return;
    }

    setLoading(true);
    try {
      const predictions = await fetchPlaceAutocomplete(
        query.trim(),
        sessionTokenRef.current,
      );
      if (predictions.length > 0) {
        const details = await fetchPlaceDetails(
          predictions[0].placeId,
          sessionTokenRef.current,
          predictions[0].description,
        );
        if (details) {
          onSearch({
            label: predictions[0].description,
            latitude: details.lat,
            longitude: details.lng,
          });
          closeOverlay();
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      <View style={styles.triggerContainer}>
        <Pressable style={styles.triggerPressable} onPress={openOverlay}>
          <Ionicons
            name="search"
            size={18}
            color={Colors.textTertiary}
            style={styles.triggerIcon}
          />
          <Text
            style={[
              styles.triggerText,
              displayText && styles.triggerTextFilled,
            ]}
            numberOfLines={1}
          >
            {displayText || placeholder}
          </Text>
        </Pressable>

        {onRecenter && (
          <>
            <View style={styles.triggerDivider} />
            <Pressable
              style={[
                styles.trailingActionBtn,
                recenterDisabled && styles.trailingActionBtnDisabled,
              ]}
              onPress={onRecenter}
              disabled={recenterDisabled}
            >
              <Ionicons
                name="locate"
                size={18}
                color={recenterDisabled ? Colors.textTertiary : Colors.primary}
              />
            </Pressable>
          </>
        )}
      </View>

      <Modal
        visible={overlayVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeOverlay}
      >
        <KeyboardAvoidingView
          style={[styles.overlayContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.overlayHeader}>
            <Pressable onPress={closeOverlay} style={styles.overlayBackBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </Pressable>
            <View style={styles.overlayInputContainer}>
              <Ionicons name="search" size={18} color={Colors.textTertiary} />
              <TextInput
                ref={inputRef}
                style={styles.overlayInput}
                value={query}
                onChangeText={handleTextChange}
                placeholder="Search for a location..."
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => {
                    setQuery("");
                    setSuggestions([]);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.suggestionsList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Ionicons name="location-outline" size={20} color={Colors.primary} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              query.length >= 2 && !loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              ) : query.length < 2 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>Type a location to search</Text>
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
