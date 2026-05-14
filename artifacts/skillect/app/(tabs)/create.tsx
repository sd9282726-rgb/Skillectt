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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { SKILL_CATEGORIES } from "@/constants/skills";
import { useAppContext } from "@/context/AppContext";

type PostType = "text" | "progress" | "image";

const POST_TYPES: { id: PostType; label: string; icon: string; desc: string }[] = [
  { id: "text", label: "Thought", icon: "edit-3", desc: "Share an insight or idea" },
  { id: "progress", label: "Progress", icon: "trending-up", desc: "Day X of learning..." },
  { id: "image", label: "Photo", icon: "image", desc: "Show your work visually" },
];

export default function CreateScreen() {
  const { userId } = useAuth();
  const { currentUserProfile, addPost } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [postType, setPostType] = useState<PostType>("progress");
  const [content, setContent] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedCat, setSelectedCat] = useState("tech");
  const [progressDay, setProgressDay] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!content.trim() || !selectedSkill) return;
    if (!userId || !currentUserProfile) return;
    if (postType === "progress") {
      const d = parseInt(progressDay, 10);
      if (isNaN(d) || d < 1) {
        Alert.alert("Day number", "Enter a valid day (e.g. 1, 7, 30)");
        return;
      }
    }

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await addPost({
      userId,
      username: currentUserProfile.username,
      displayName: currentUserProfile.displayName,
      avatarUri: currentUserProfile.avatarUri,
      content: content.trim(),
      imageUri: postType === "image" ? imageUri : undefined,
      skillTag: selectedSkill,
      progressDay:
        postType === "progress" ? parseInt(progressDay, 10) : undefined,
      postType,
    });

    setContent("");
    setSelectedSkill("");
    setProgressDay("");
    setImageUri(undefined);
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  const canPost =
    content.trim().length > 0 &&
    selectedSkill &&
    (postType !== "progress" || progressDay);

  const TOP = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: TOP + 16,
          paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Create a post</Text>

      <View style={styles.typeRow}>
        {POST_TYPES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPostType(t.id);
              if (t.id !== "image") setImageUri(undefined);
            }}
            style={[styles.typeBtn, postType === t.id && styles.typeBtnActive]}
          >
            <Feather
              name={t.icon as any}
              size={14}
              color={postType === t.id ? "#00D4FF" : "#666688"}
            />
            <Text
              style={[
                styles.typeBtnText,
                postType === t.id && styles.typeBtnTextActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(currentUserProfile?.displayName ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.authorName}>
            {currentUserProfile?.displayName ?? "..."}
          </Text>
          <Text style={styles.authorUsername}>
            @{currentUserProfile?.username ?? "..."}
          </Text>
        </View>
      </View>

      {postType === "progress" && (
        <View style={styles.dayRow}>
          <Text style={styles.dayLabel}>Day</Text>
          <TextInput
            style={styles.dayInput}
            placeholder="42"
            placeholderTextColor="#333358"
            value={progressDay}
            onChangeText={(v) => setProgressDay(v.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text style={styles.dayOf}>of my journey</Text>
        </View>
      )}

      <TextInput
        style={styles.contentInput}
        placeholder={
          postType === "progress"
            ? "What did you learn or build today?"
            : postType === "image"
            ? "Add a caption..."
            : "Share a thought or insight..."
        }
        placeholderTextColor="#333358"
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{content.length}/500</Text>

      {postType === "image" && (
        <>
          {imageUri ? (
            <View style={styles.imgWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImg}
                resizeMode="cover"
              />
              <Pressable
                style={styles.removeImg}
                onPress={() => setImageUri(undefined)}
              >
                <Feather name="x" size={14} color="#F0F0FA" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.imgPicker} onPress={pickImage}>
              <Feather name="image" size={22} color="#555578" />
              <Text style={styles.imgPickerText}>Tap to add a photo</Text>
            </Pressable>
          )}
        </>
      )}

      <Text style={styles.sectionLabel}>Skill Tag *</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {SKILL_CATEGORIES.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              setSelectedCat(c.id);
              setSelectedSkill("");
            }}
            style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
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
        ).map((skill) => {
          const sel = selectedSkill === skill.id;
          return (
            <Pressable
              key={skill.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedSkill(skill.id);
              }}
              style={({ pressed }) => [
                styles.skillChip,
                sel && {
                  backgroundColor: skill.color + "22",
                  borderColor: skill.color + "88",
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View
                style={[
                  styles.skillDot,
                  { backgroundColor: sel ? skill.color : "#444460" },
                ]}
              />
              <Text
                style={[styles.skillChipText, sel && { color: skill.color }]}
              >
                {skill.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.postBtn,
          !canPost && styles.postBtnDisabled,
          pressed && canPost && styles.postBtnPressed,
        ]}
        onPress={handlePost}
        disabled={!canPost || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#0A0A0F" size="small" />
        ) : (
          <Text style={styles.postBtnText}>Post</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 16,
  },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D0D18",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  typeBtnActive: { borderColor: "#00D4FF55", backgroundColor: "#00D4FF10" },
  typeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#555578" },
  typeBtnTextActive: { color: "#00D4FF" },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E1E32",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#00D4FF" },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#F0F0FA" },
  authorUsername: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555578" },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    backgroundColor: "#0D0D18",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  dayLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#666688" },
  dayInput: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    width: 70,
    textAlign: "center",
  },
  dayOf: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#444460" },
  contentInput: {
    backgroundColor: "#0D0D18",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
    minHeight: 100,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#333358",
    textAlign: "right",
    marginBottom: 16,
  },
  imgPicker: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0D0D18",
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: "#1E1E32",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  imgPickerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#555578",
  },
  imgWrap: { position: "relative", marginBottom: 20 },
  previewImg: { width: "100%", height: 180, borderRadius: 12 },
  removeImg: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#444460",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  catRow: { gap: 8, paddingBottom: 12 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#0D0D18",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  catChipActive: { borderColor: "#00D4FF55", backgroundColor: "#00D4FF10" },
  catChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#666688" },
  catChipTextActive: { color: "#00D4FF" },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0D18",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#1E1E32",
    gap: 5,
  },
  skillDot: { width: 5, height: 5, borderRadius: 3 },
  skillChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#666688" },
  postBtn: {
    backgroundColor: "#00D4FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  postBtnDisabled: { opacity: 0.3 },
  postBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  postBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
