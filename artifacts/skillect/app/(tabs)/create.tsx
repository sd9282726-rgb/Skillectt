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
import { C } from "@/constants/colors";

type PostType = "text" | "progress" | "image" | "project";

const POST_TYPES: { id: PostType; label: string; icon: string; desc: string }[] = [
  { id: "text", label: "Thought", icon: "edit-3", desc: "Share an insight or idea" },
  { id: "progress", label: "Progress", icon: "trending-up", desc: "Day X of your journey" },
  { id: "image", label: "Photo", icon: "image", desc: "Show your work" },
  { id: "project", label: "Project", icon: "layers", desc: "Showcase a build" },
];

const TECH_STACK_OPTIONS = [
  "React", "React Native", "Next.js", "Node.js", "Python", "TypeScript",
  "Expo", "Firebase", "Supabase", "PostgreSQL", "MongoDB", "Tailwind",
  "Flutter", "Swift", "Kotlin", "Django", "FastAPI", "Figma",
];

export default function CreateScreen() {
  const { userId } = useAuth();
  const { currentUserProfile, addPost, addProject } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [postType, setPostType] = useState<PostType>("progress");
  const [content, setContent] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedCat, setSelectedCat] = useState("tech");
  const [progressDay, setProgressDay] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [projectStatus, setProjectStatus] = useState<"building" | "launched" | "paused">("building");
  const [projectUrl, setProjectUrl] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const handlePost = async () => {
    if (!userId || !currentUserProfile) return;
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (postType === "project") {
      if (!projectTitle.trim() || !projectDesc.trim()) {
        Alert.alert("Missing fields", "Please fill in project title and description.");
        setIsLoading(false);
        return;
      }
      await addProject({
        userId,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        avatarUri: currentUserProfile.avatarUri,
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        techStack: selectedTech,
        status: projectStatus,
        liveUrl: projectUrl.trim(),
      });
      setProjectTitle(""); setProjectDesc(""); setSelectedTech([]); setProjectUrl("");
      setIsLoading(false);
      router.replace("/(tabs)/profile");
      return;
    }

    if (!content.trim() || !selectedSkill) { setIsLoading(false); return; }
    if (postType === "progress") {
      const d = parseInt(progressDay, 10);
      if (isNaN(d) || d < 1) {
        Alert.alert("Day number", "Enter a valid day number (e.g. 1, 7, 30)");
        setIsLoading(false);
        return;
      }
    }

    await addPost({
      userId,
      username: currentUserProfile.username,
      displayName: currentUserProfile.displayName,
      avatarUri: currentUserProfile.avatarUri,
      content: content.trim(),
      imageUri: postType === "image" ? imageUri : undefined,
      skillTag: selectedSkill,
      progressDay: postType === "progress" ? parseInt(progressDay, 10) : undefined,
      postType: postType === "project" ? "text" : postType,
    });

    setContent(""); setSelectedSkill(""); setProgressDay(""); setImageUri(undefined);
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  const canPost =
    postType === "project"
      ? projectTitle.trim().length > 0 && projectDesc.trim().length > 0
      : content.trim().length > 0 && selectedSkill && (postType !== "progress" || progressDay);

  const TOP = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingTop: TOP + 20, paddingBottom: 100 + insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Create</Text>
      <Text style={styles.subheading}>Build in public. Ship daily.</Text>

      <View style={styles.typeGrid}>
        {POST_TYPES.map((t) => {
          const active = postType === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPostType(t.id);
                if (t.id !== "image") setImageUri(undefined);
              }}
              style={({ pressed }) => [styles.typeBtn, active && styles.typeBtnActive, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                <Feather name={t.icon as any} size={18} color={active ? C.bg : C.dim} />
              </View>
              <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </Pressable>
          );
        })}
      </View>

      {postType === "project" ? (
        <View style={styles.projectForm}>
          <Text style={styles.fieldLabel}>Project Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. StudyFlow, TradeLog..."
            placeholderTextColor={C.muted}
            value={projectTitle}
            onChangeText={setProjectTitle}
            maxLength={60}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Description *</Text>
          <TextInput
            style={[styles.input, styles.multiInput]}
            placeholder="What is this project? Who is it for? What problem does it solve?"
            placeholderTextColor={C.muted}
            value={projectDesc}
            onChangeText={setProjectDesc}
            multiline
            maxLength={400}
            textAlignVertical="top"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Status</Text>
          <View style={styles.statusRow}>
            {(["building", "launched", "paused"] as const).map((s) => {
              const color = s === "launched" ? C.primary : s === "building" ? C.neonBlue : C.dim;
              return (
                <Pressable
                  key={s}
                  onPress={() => setProjectStatus(s)}
                  style={[styles.statusBtn, projectStatus === s && { backgroundColor: color + "18", borderColor: color + "50" }]}
                >
                  <View style={[styles.statusDot, { backgroundColor: projectStatus === s ? color : C.dim }]} />
                  <Text style={[styles.statusText, projectStatus === s && { color }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Tech Stack</Text>
          <View style={styles.techGrid}>
            {TECH_STACK_OPTIONS.map((tech) => {
              const sel = selectedTech.includes(tech);
              return (
                <Pressable
                  key={tech}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTech((prev) =>
                      sel ? prev.filter((t) => t !== tech) : [...prev, tech]
                    );
                  }}
                  style={[styles.techChip, sel && styles.techChipActive]}
                >
                  <Text style={[styles.techChipText, sel && styles.techChipTextActive]}>{tech}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Live URL (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://yourproject.com"
            placeholderTextColor={C.muted}
            value={projectUrl}
            onChangeText={setProjectUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      ) : (
        <>
          <View style={styles.authorRow}>
            <View style={[styles.avatarFallback, { borderColor: C.primaryBorder }]}>
              <Text style={styles.avatarText}>
                {(currentUserProfile?.displayName ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{currentUserProfile?.displayName ?? "..."}</Text>
              <Text style={styles.authorHandle}>@{currentUserProfile?.username ?? "..."}</Text>
            </View>
          </View>

          {postType === "progress" && (
            <View style={styles.dayRow}>
              <Text style={styles.dayLabel}>Day</Text>
              <TextInput
                style={styles.dayInput}
                placeholder="42"
                placeholderTextColor={C.muted}
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
                ? "What did you learn or ship today?"
                : postType === "image"
                ? "Add a caption..."
                : "Share a thought or insight..."
            }
            placeholderTextColor={C.muted}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length}/500</Text>

          {postType === "image" && (
            imageUri ? (
              <View style={styles.imgWrap}>
                <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />
                <Pressable style={styles.removeImg} onPress={() => setImageUri(undefined)}>
                  <Feather name="x" size={14} color={C.text} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imgPicker} onPress={pickImage}>
                <Feather name="image" size={22} color={C.dim} />
                <Text style={styles.imgPickerText}>Tap to add a photo</Text>
              </Pressable>
            )
          )}

          <Text style={styles.fieldLabel}>Skill Tag *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {SKILL_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => { setSelectedCat(c.id); setSelectedSkill(""); }}
                style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, selectedCat === c.id && styles.catChipTextActive]}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.skillsGrid}>
            {(SKILL_CATEGORIES.find((c) => c.id === selectedCat)?.skills ?? []).map((skill) => {
              const sel = selectedSkill === skill.id;
              return (
                <Pressable
                  key={skill.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedSkill(skill.id); }}
                  style={[styles.skillChip, sel && { backgroundColor: skill.color + "18", borderColor: skill.color + "60" }]}
                >
                  <View style={[styles.skillDot, { backgroundColor: sel ? skill.color : C.dim }]} />
                  <Text style={[styles.skillChipText, sel && { color: skill.color }]}>{skill.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Pressable
        style={({ pressed }) => [styles.postBtn, !canPost && styles.postBtnDisabled, pressed && canPost && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
        onPress={handlePost}
        disabled={!canPost || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={C.bg} size="small" />
        ) : (
          <>
            <Feather name={postType === "project" ? "layers" : "send"} size={16} color={C.bg} />
            <Text style={styles.postBtnText}>
              {postType === "project" ? "Showcase Project" : "Post"}
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4, letterSpacing: -0.5 },
  subheading: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.dim, marginBottom: 22 },
  typeGrid: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  typeBtn: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  typeBtnActive: { borderColor: C.primaryBorder, backgroundColor: C.primaryDim },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  typeLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.subtext, marginTop: 4 },
  typeLabelActive: { color: C.primary },
  typeDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primaryDim,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.primary },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  authorHandle: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.dim },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  dayLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.dim },
  dayInput: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.primary, width: 70, textAlign: "center" },
  dayOf: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
  contentInput: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 110,
    marginBottom: 6,
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim, textAlign: "right", marginBottom: 18 },
  imgPicker: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: C.border2,
    borderStyle: "dashed",
    marginBottom: 20,
  },
  imgPickerText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
  imgWrap: { position: "relative", marginBottom: 20 },
  previewImg: { width: "100%", height: 180, borderRadius: 12 },
  removeImg: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 6 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.dim,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  catRow: { gap: 8, paddingBottom: 14 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  catChipActive: { borderColor: C.primaryBorder, backgroundColor: C.primaryDim },
  catChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.dim },
  catChipTextActive: { color: C.primary },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.border,
    gap: 5,
  },
  skillDot: { width: 5, height: 5, borderRadius: 3 },
  skillChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.dim },
  postBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  postBtnDisabled: { opacity: 0.3, shadowColor: "transparent" },
  postBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.bg },
  projectForm: { gap: 0 },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  multiInput: { minHeight: 100, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 0 },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.dim },
  techGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 0 },
  techChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  techChipActive: { backgroundColor: C.primaryDim, borderColor: C.primaryBorder },
  techChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.dim },
  techChipTextActive: { color: C.primary },
});
