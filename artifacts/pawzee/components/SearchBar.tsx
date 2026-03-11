import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search location..." }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
      Keyboard.dismiss();
    }
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={Colors.textTertiary} style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
      />
      {query.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as Record<string, string>) : {}),
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
