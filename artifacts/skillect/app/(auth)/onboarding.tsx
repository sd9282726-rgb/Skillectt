import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { SKILLS } from "@/constants/skills";
import { useAppContext } from "@/context/AppContext";

export default function OnboardingPage() {
  const { userId } = useAuth();
  const { saveUserProfile } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const toggleSkill = (skillId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((s) => s !== skillId)
        : [...prev, skillId]
    );
  };

  const validateUsername = (val: string) => {
    if (!val) return "Username is required";
    if (val.length < 3) return "Username must be at least 3 characters";
    if (!/^[a-z0-9_]+$/.test(val))
      return "Only lowercase letters, numbers, and underscores";
    return "";
  };

  const handleContinue = async () => {
    const err = validateUsername(username);
    if (err) {
      setUsernameError(err);
      return;
    }
    if (selectedSkills.length === 0) return;
    if (!userId) return;

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await saveUserProfile({
      userId,
      username,
      bio,
      skills: selectedSkills,
      onboardingCompleted: true,
    });

    router.replace("/(tabs)");
  };

  const canContinue = username.length >= 3 && selectedSkills.length >= 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 32,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>Skillect</Text>
      <Text style={styles.heading}>Set up your profile</Text>
      <Text style={styles.subheading}>
        Tell the community who you are and what you're building
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Username</Text>
        <TextInput
          style={[styles.input, usernameError ? styles.inputError : null]}
          placeholder="e.g. aryan_codes"
          placeholderTextColor="#444460"
          value={username}
          onChangeText={(v) => {
            setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""));
            setUsernameError("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
        />
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : (
          <Text style={styles.hint}>Only lowercase letters, numbers, underscores</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Bio <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="I'm learning to code and build apps..."
          placeholderTextColor="#444460"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          Skills I'm learning{" "}
          <Text style={styles.required}>* pick at least one</Text>
        </Text>
        <View style={styles.skillsGrid}>
          {SKILLS.map((skill) => {
            const selected = selectedSkills.includes(skill.id);
            return (
              <Pressable
                key={skill.id}
                onPress={() => toggleSkill(skill.id)}
                style={({ pressed }) => [
                  styles.skillChip,
                  selected && { backgroundColor: skill.color + "22", borderColor: skill.color },
                  pressed && styles.chipPressed,
                ]}
              >
                <View
                  style={[
                    styles.skillDot,
                    { backgroundColor: selected ? skill.color : "#444460" },
                  ]}
                />
                <Text
                  style={[
                    styles.skillName,
                    selected && { color: skill.color },
                  ]}
                >
                  {skill.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          !canContinue && styles.buttonDisabled,
          pressed && canContinue && styles.buttonPressed,
        ]}
        onPress={handleContinue}
        disabled={!canContinue || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#0A0A0F" size="small" />
        ) : (
          <Text style={styles.buttonText}>Start my journey</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logo: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    lineHeight: 22,
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optional: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    textTransform: "none",
  },
  required: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#00D4FF",
    textTransform: "none",
  },
  input: {
    backgroundColor: "#12121C",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  inputError: {
    borderColor: "#FF4444",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    textAlign: "right",
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF4444",
    marginTop: 4,
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121C",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1E1E32",
    gap: 6,
  },
  chipPressed: {
    opacity: 0.75,
  },
  skillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  skillName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#A0A0C0",
  },
  button: {
    backgroundColor: "#00D4FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});
