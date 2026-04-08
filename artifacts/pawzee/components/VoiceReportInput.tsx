import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { transcribeAudio } from "@/lib/api";

interface VoiceReportInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onTranscript?: (text: string) => void;
  onError?: () => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "transcribing" | "done" | "error";

export function VoiceReportInput({
  value,
  onChangeText,
  onTranscript,
  onError,
  disabled,
}: VoiceReportInputProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    if (disabled || recordingState === "recording" || recordingState === "transcribing") return;
    setErrorMsg(null);

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Microphone permission is required to record audio.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setRecordingState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: any) {
      setErrorMsg("Could not start recording. Please try again.");
      setRecordingState("error");
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording || recordingState !== "recording") return;

    setRecordingState("transcribing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("Recording URI is missing.");
      }

      const ext = uri.split(".").pop()?.toLowerCase() || "m4a";
      const mimeType =
        ext === "webm"
          ? "audio/webm"
          : ext === "3gp"
            ? "audio/3gpp"
            : Platform.OS === "ios"
              ? "audio/m4a"
              : "audio/mp4";

      const text = await transcribeAudio(uri, mimeType);
      onChangeText(text);
      onTranscript?.(text);
      setRecordingState("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Transcription failed. You can type your notes instead.");
      setRecordingState("error");
      onError?.();
    }
  };

  const isRecording = recordingState === "recording";
  const isTranscribing = recordingState === "transcribing";
  const isBusy = isRecording || isTranscribing;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.label}>Notes (optional)</Text>
      </View>

      <View style={styles.voiceRow}>
        <Pressable
          style={[
            styles.micBtn,
            isRecording && styles.micBtnActive,
            (disabled || isTranscribing) && styles.micBtnDisabled,
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={disabled || isTranscribing}
        >
          {isTranscribing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons
              name={isRecording ? "mic" : "mic-outline"}
              size={24}
              color={isRecording ? "#FFF" : Colors.primary}
            />
          )}
        </Pressable>

        <Text style={styles.micHint}>
          {isRecording
            ? "Release to transcribe…"
            : isTranscribing
              ? "Transcribing…"
              : "Hold to speak"}
        </Text>
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording…</Text>
        </View>
      )}

      {errorMsg && (
        <Text style={styles.errorText}>{errorMsg}</Text>
      )}

      <TextInput
        style={[styles.textInput, isBusy && styles.textInputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Describe the hazard (or use the mic above)…"
        placeholderTextColor={Colors.textTertiary}
        multiline
        numberOfLines={3}
        editable={!disabled && !isBusy}
        maxLength={500}
      />

      {value.length > 0 && (
        <Text style={styles.charCount}>{value.length}/500</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 4,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  micBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  micBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 1.08 }],
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
  micHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  recordingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.accent,
    paddingHorizontal: 4,
  },
  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  textInputDisabled: {
    opacity: 0.6,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "right",
    paddingRight: 4,
  },
});
