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
import { SKILLS } from "@/constants/skills";
import { useAppContext } from "@/context/AppContext";

export default function CreateScreen() {
  const { userId } = useAuth();
  const { currentUserProfile, addPost } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
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
    if (!content.trim() || !selectedSkill || !progressDay) return;
    if (!userId || !currentUserProfile) return;

    const day = parseInt(progressDay, 10);
    if (isNaN(day) || day < 1) {
      Alert.alert("Invalid day", "Enter a valid day number (e.g. 1, 7, 30)");
      return;
    }

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await addPost({
      userId,
      username: currentUserProfile.username,
      content: content.trim(),
      imageUri,
      skillTag: selectedSkill,
      progressDay: day,
    });

    setContent("");
    setSelectedSkill("");
    setProgressDay("");
    setImageUri(undefined);
    setIsLoading(false);

    router.replace("/(tabs)");
  };

  const canPost = content.trim().length > 0 && selectedSkill && progressDay;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop:
            insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom:
            80 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Share your progress</Text>
      <Text style={styles.subheading}>
        Document today's win, lesson, or milestone
      </Text>

      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(currentUserProfile?.username ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>
          @{currentUserProfile?.username ?? "..."}
        </Text>
      </View>

      <TextInput
        style={styles.contentInput}
        placeholder="What did you learn or build today?"
        placeholderTextColor="#444460"
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{content.length}/500</Text>

      {imageUri ? (
        <View style={styles.imagePreviewWrap}>
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <Pressable
            style={styles.removeImage}
            onPress={() => setImageUri(undefined)}
          >
            <Feather name="x" size={14} color="#F0F0FA" />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.imagePicker} onPress={pickImage}>
          <Feather name="image" size={18} color="#666688" />
          <Text style={styles.imagePickerText}>Add photo (optional)</Text>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>Progress Day *</Text>
      <View style={styles.dayRow}>
        <Text style={styles.dayLabel}>Day</Text>
        <TextInput
          style={styles.dayInput}
          placeholder="e.g. 7"
          placeholderTextColor="#444460"
          value={progressDay}
          onChangeText={(v) => setProgressDay(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      <Text style={styles.sectionLabel}>Skill Tag *</Text>
      <View style={styles.skillsGrid}>
        {SKILLS.map((skill) => {
          const selected = selectedSkill === skill.id;
          return (
            <Pressable
              key={skill.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedSkill(skill.id);
              }}
              style={({ pressed }) => [
                styles.skillChip,
                selected && {
                  backgroundColor: skill.color + "22",
                  borderColor: skill.color,
                },
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
                  styles.skillChipText,
                  selected && { color: skill.color },
                ]}
              >
                {skill.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.postButton,
          !canPost && styles.postButtonDisabled,
          pressed && canPost && styles.postButtonPressed,
        ]}
        onPress={handlePost}
        disabled={!canPost || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#0A0A0F" size="small" />
        ) : (
          <Text style={styles.postButtonText}>Post Progress</Text>
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
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E1E32",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
  },
  username: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
  },
  contentInput: {
    backgroundColor: "#12121C",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
    minHeight: 120,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    textAlign: "right",
    marginBottom: 16,
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#12121C",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E1E32",
    borderStyle: "dashed",
    marginBottom: 24,
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666688",
  },
  imagePreviewWrap: {
    position: "relative",
    marginBottom: 24,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  removeImage: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  dayLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#666688",
  },
  dayInput: {
    backgroundColor: "#12121C",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    borderWidth: 1,
    borderColor: "#1E1E32",
    width: 100,
    textAlign: "center",
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 28,
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
  skillChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#666688",
  },
  postButton: {
    backgroundColor: "#00D4FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  postButtonDisabled: {
    opacity: 0.35,
  },
  postButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});
