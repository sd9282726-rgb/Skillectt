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

export default function EditProfileScreen() {
  const { userId } = useAuth();
  const { currentUserProfile, saveUserProfile } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState(
    currentUserProfile?.displayName ?? ""
  );
  const [bio, setBio] = useState(currentUserProfile?.bio ?? "");
  const [currentlyBuilding, setCurrentlyBuilding] = useState(
    currentUserProfile?.currentlyBuilding ?? ""
  );
  const [avatarUri, setAvatarUri] = useState<string | undefined>(
    currentUserProfile?.avatarUri
  );
  const [isSaving, setIsSaving] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
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
      <View
        style={[
          styles.header,
          {
            paddingTop: TOP,
            height: 56 + TOP,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={styles.headerBtn}
        >
          {isSaving ? (
            <ActivityIndicator color="#00D4FF" size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: 56 + TOP + 24,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
          },
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
            <Feather name="camera" size={18} color="#F0F0FA" />
          </View>
          <Text style={styles.changePhotoText}>Change photo</Text>
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#333358"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={40}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={styles.inputReadonly}>
            <Text style={styles.inputReadonlyText}>
              @{currentUserProfile?.username}
            </Text>
          </View>
          <Text style={styles.hint}>Username cannot be changed</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Bio <Text style={styles.opt}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell the community about yourself..."
            placeholderTextColor="#333358"
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
          <Text style={styles.fieldLabel}>
            Currently Building <Text style={styles.opt}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. A productivity app for students"
            placeholderTextColor="#333358"
            value={currentlyBuilding}
            onChangeText={setCurrentlyBuilding}
            maxLength={80}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            isSaving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#0A0A0F" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#0A0A0F",
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  headerBtn: { minWidth: 60 },
  cancelText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#666688" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#F0F0FA" },
  saveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#00D4FF", textAlign: "right" },
  scroll: { paddingHorizontal: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#12121C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1E1E32",
  },
  avatarInitial: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#00D4FF" },
  avatarOverlay: {
    position: "absolute",
    bottom: 28,
    right: "35%",
    backgroundColor: "#00D4FF",
    borderRadius: 14,
    padding: 5,
  },
  changePhotoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#00D4FF",
    marginTop: 8,
  },
  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  opt: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555578", textTransform: "none" },
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
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 13 },
  inputReadonly: {
    backgroundColor: "#08080F",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  inputReadonlyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#555578",
  },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#333358", marginTop: 4 },
  charCount: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#333358",
    textAlign: "right",
    marginTop: 3,
  },
  saveBtn: {
    backgroundColor: "#00D4FF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
