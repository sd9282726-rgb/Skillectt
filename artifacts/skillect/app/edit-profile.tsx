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
import { useAppContext } from "@/context/AppContext";
import { C } from "@/constants/colors";

export default function EditProfileScreen() {
  const { userId } = useAuth();
  const { currentUserProfile, saveUserProfile } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState(currentUserProfile?.displayName ?? "");
  const [bio, setBio] = useState(currentUserProfile?.bio ?? "");
  const [currentlyBuilding, setCurrentlyBuilding] = useState(currentUserProfile?.currentlyBuilding ?? "");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUserProfile?.avatarUri);
  const [isSaving, setIsSaving] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!currentUserProfile || !userId) return;
    if (!displayName.trim()) {
      Alert.alert("Display name required");
      return;
    }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveUserProfile({
      ...currentUserProfile,
      displayName: displayName.trim(),
      bio: bio.trim(),
      currentlyBuilding: currentlyBuilding.trim(),
      avatarUri,
    });
    setIsSaving(false);
    router.back();
  };

  const TOP = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: TOP, height: 56 + TOP }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={isSaving} style={styles.headerBtn}>
          {isSaving ? (
            <ActivityIndicator color={C.primary} size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 56 + TOP + 24, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.avatarSection} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase() ||
                  currentUserProfile?.username.charAt(0).toUpperCase() ||
                  "?"}
              </Text>
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <Feather name="camera" size={16} color={C.bg} />
          </View>
          <Text style={styles.changePhotoText}>Change photo</Text>
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={C.muted}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={40}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={styles.inputReadonly}>
            <Text style={styles.inputReadonlyText}>@{currentUserProfile?.username}</Text>
          </View>
          <Text style={styles.hint}>Username cannot be changed</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bio <Text style={styles.opt}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell the community about yourself..."
            placeholderTextColor={C.muted}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            maxLength={150}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/150</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Currently Building <Text style={styles.opt}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. A productivity app for students"
            placeholderTextColor={C.muted}
            value={currentlyBuilding}
            onChangeText={setCurrentlyBuilding}
            maxLength={80}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={C.bg} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#040410",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  headerBtn: { minWidth: 60 },
  cancelText: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.dim },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
  saveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.primary, textAlign: "right" },
  scroll: { paddingHorizontal: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.primaryBorder,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  avatarInitial: { fontSize: 32, fontFamily: "Inter_700Bold", color: C.primary },
  avatarOverlay: {
    position: "absolute",
    bottom: 28,
    right: "35%",
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.primary, marginTop: 8 },
  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  opt: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.dim, textTransform: "none" },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.border2,
  },
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 13 },
  inputReadonly: {
    backgroundColor: "#06060E",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputReadonlyText: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.dim },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 4 },
  charCount: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.dim, textAlign: "right", marginTop: 3 },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  saveBtnDisabled: { opacity: 0.4, shadowColor: "transparent" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.bg },
});
