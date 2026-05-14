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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { SKILL_CATEGORIES } from "@/constants/skills";
import { useAppContext } from "@/context/AppContext";

const INTERESTS = [
  "Tech & Coding",
  "Business & Startups",
  "Finance & Investing",
  "Content Creation",
  "Design & Art",
  "Health & Fitness",
  "Science",
  "Gaming",
];

export default function OnboardingPage() {
  const { userId } = useAuth();
  const { saveUserProfile } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [usernameErr, setUsernameErr] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState("tech");
  const [bio, setBio] = useState("");
  const [currentlyBuilding, setCurrentlyBuilding] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const validateStep1 = () => {
    if (!username || username.length < 3) {
      setUsernameErr("At least 3 characters");
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameErr("Lowercase letters, numbers, underscores only");
      return false;
    }
    if (!displayName || displayName.length < 2) {
      setUsernameErr("Display name required");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && selectedSkills.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => (s + 1) as 1 | 2 | 3);
  };

  const handleFinish = async () => {
    if (!userId) return;
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveUserProfile({
      userId,
      username,
      displayName: displayName || username,
      bio,
      skills: selectedSkills,
      customSkills: [],
      interests,
      currentlyBuilding,
      avatarUri,
      onboardingCompleted: true,
      followers: [],
      joinedAt: new Date().toISOString(),
    });
    router.replace("/(tabs)");
  };

  const toggleSkill = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSkills((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
  };

  const toggleInterest = (i: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInterests((p) =>
      p.includes(i) ? p.filter((x) => x !== i) : [...p, i]
    );
  };

  const TOP = insets.top + (Platform.OS === "web" ? 67 : 0) + 20;

  const stepPct = ((step - 1) / 2) * 100 + 33;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: TOP,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>Skillect</Text>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${stepPct}%` as any }]} />
      </View>
      <Text style={styles.stepLabel}>Step {step} of 3</Text>

      {step === 1 && (
        <View>
          <Text style={styles.stepTitle}>Create your profile</Text>
          <Text style={styles.stepSub}>
            Choose a name and username for the community
          </Text>

          <Pressable style={styles.avatarPicker} onPress={pickAvatar}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="camera" size={24} color="#555578" />
                <Text style={styles.avatarHint}>Add photo</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Aryan Sharma"
              placeholderTextColor="#333358"
              value={displayName}
              onChangeText={setDisplayName}
              autoCorrect={false}
              maxLength={40}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={[styles.input, usernameErr ? styles.inputErr : null]}
              placeholder="aryan_codes"
              placeholderTextColor="#333358"
              value={username}
              onChangeText={(v) => {
                setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                setUsernameErr("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            {usernameErr ? (
              <Text style={styles.errText}>{usernameErr}</Text>
            ) : (
              <Text style={styles.hint}>
                Lowercase, numbers, underscores
              </Text>
            )}
          </View>

          <Pressable
            style={[
              styles.nextBtn,
              (!username || !displayName) && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={!username || !displayName}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Feather name="arrow-right" size={16} color="#0A0A0F" />
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.stepTitle}>What are you learning?</Text>
          <Text style={styles.stepSub}>
            Pick at least one skill — this shapes your feed
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {SKILL_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCat(c.id)}
                style={[
                  styles.catChip,
                  selectedCat === c.id && styles.catChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    selectedCat === c.id && styles.catChipTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.skillsGrid}>
            {(
              SKILL_CATEGORIES.find((c) => c.id === selectedCat)?.skills ?? []
            ).map((s) => {
              const sel = selectedSkills.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggleSkill(s.id)}
                  style={[
                    styles.skillChip,
                    sel && {
                      backgroundColor: s.color + "22",
                      borderColor: s.color,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.skillDot,
                      { backgroundColor: sel ? s.color : "#444460" },
                    ]}
                  />
                  <Text
                    style={[styles.skillChipText, sel && { color: s.color }]}
                  >
                    {s.name}
                  </Text>
                  {sel && <Feather name="check" size={10} color={s.color} />}
                </Pressable>
              );
            })}
          </View>

          {selectedSkills.length > 0 && (
            <Text style={styles.selectedCount}>
              {selectedSkills.length} skill
              {selectedSkills.length > 1 ? "s" : ""} selected
            </Text>
          )}

          <Pressable
            style={[
              styles.nextBtn,
              selectedSkills.length === 0 && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={selectedSkills.length === 0}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Feather name="arrow-right" size={16} color="#0A0A0F" />
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.stepTitle}>About you</Text>
          <Text style={styles.stepSub}>Help others understand your journey</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Bio <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="I'm learning to code and build apps..."
              placeholderTextColor="#333358"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Currently building{" "}
              <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="A productivity app for students"
              placeholderTextColor="#333358"
              value={currentlyBuilding}
              onChangeText={setCurrentlyBuilding}
              maxLength={80}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>
            Interests <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.skillsGrid}>
            {INTERESTS.map((i) => {
              const sel = interests.includes(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => toggleInterest(i)}
                  style={[
                    styles.interestChip,
                    sel && styles.interestChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.interestText,
                      sel && styles.interestTextActive,
                    ]}
                  >
                    {i}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.nextBtn, isLoading && styles.nextBtnDisabled]}
            onPress={handleFinish}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0A0F" size="small" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>Start my journey</Text>
                <Feather name="zap" size={16} color="#0A0A0F" />
              </>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  logo: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    marginBottom: 20,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#1E1E32",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: { height: 3, backgroundColor: "#00D4FF", borderRadius: 2 },
  stepLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    marginBottom: 28,
    lineHeight: 20,
  },
  avatarPicker: { alignSelf: "center", marginBottom: 28 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#12121C",
    borderWidth: 2,
    borderColor: "#1E1E32",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  avatarHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555578" },
  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optional: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#555578",
    textTransform: "none",
  },
  input: {
    backgroundColor: "#0D0D18",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  inputErr: { borderColor: "#FF4444" },
  textArea: { height: 88, textAlignVertical: "top", paddingTop: 13 },
  errText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#FF4444",
    marginTop: 4,
  },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#333358", marginTop: 4 },
  charCount: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#333358",
    textAlign: "right",
    marginTop: 3,
  },
  catRow: { gap: 8, paddingBottom: 14 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0D0D18",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  catChipActive: { borderColor: "#00D4FF55", backgroundColor: "#00D4FF10" },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#666688" },
  catChipTextActive: { color: "#00D4FF" },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0D18",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1E1E32",
    gap: 5,
  },
  skillDot: { width: 5, height: 5, borderRadius: 3 },
  skillChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#666688" },
  selectedCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#00D4FF",
    marginBottom: 20,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0D0D18",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  interestChipActive: { borderColor: "#00D4FF55", backgroundColor: "#00D4FF10" },
  interestText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#666688" },
  interestTextActive: { color: "#00D4FF" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00D4FF",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
  },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
