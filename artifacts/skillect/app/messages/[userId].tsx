import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Message, UserProfile } from "@/context/AppContext";
import { Avatar } from "../(tabs)/index";

function timeStr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId: string }>();
  const { userId } = useAuth();
  const { getUserProfile, getMessages, sendMessage } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);

  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const convId = userId && paramUserId
    ? [userId, paramUserId].sort().join("_")
    : "";

  useEffect(() => {
    if (!paramUserId) return;
    Promise.all([
      getUserProfile(paramUserId),
      convId ? getMessages(convId) : Promise.resolve([]),
    ]).then(([profile, msgs]) => {
      setOtherProfile(profile);
      setMessages(msgs);
      setLoading(false);
    });
  }, [paramUserId]);

  const handleSend = async () => {
    if (!text.trim() || !otherProfile || !userId) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const content = text.trim();
    setText("");
    await sendMessage(
      otherProfile.userId,
      otherProfile.username,
      otherProfile.displayName,
      otherProfile.avatarUri,
      content
    );
    const updated = await getMessages(convId);
    setMessages(updated);
    setSending(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const TOP = 56 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            height: TOP,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F0F0FA" />
        </Pressable>
        {otherProfile && (
          <View style={styles.headerUser}>
            <Avatar
              uri={otherProfile.avatarUri}
              name={otherProfile.displayName}
              size={32}
            />
            <View>
              <Text style={styles.headerName}>{otherProfile.displayName}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Active now</Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={[styles.center, { paddingTop: TOP }]}>
          <ActivityIndicator color="#00D4FF" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.msgList,
            {
              paddingTop: TOP + 8,
              paddingBottom: 80 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
            },
          ]}
          onContentSizeChange={() =>
            flatRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === userId;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  isMe ? styles.bubbleRight : styles.bubbleLeft,
                ]}
              >
                {!isMe && otherProfile && (
                  <Avatar
                    uri={otherProfile.avatarUri}
                    name={otherProfile.displayName}
                    size={28}
                  />
                )}
                <View>
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleThem,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isMe ? styles.bubbleTextMe : styles.bubbleTextThem,
                      ]}
                    >
                      {item.content}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.bubbleTime,
                      isMe ? { textAlign: "right" } : null,
                    ]}
                  >
                    {timeStr(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Avatar
                uri={otherProfile?.avatarUri}
                name={otherProfile?.displayName ?? "?"}
                size={64}
              />
              <Text style={styles.emptyChatName}>
                {otherProfile?.displayName}
              </Text>
              <Text style={styles.emptyChatSub}>
                @{otherProfile?.username} · Start the conversation
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
          },
        ]}
      >
        <TextInput
          style={styles.msgInput}
          placeholder="Message..."
          placeholderTextColor="#333358"
          value={text}
          onChangeText={setText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!text.trim() || sending) && styles.sendBtnDisabled,
            pressed && styles.sendBtnPressed,
          ]}
        >
          {sending ? (
            <ActivityIndicator color="#0A0A0F" size="small" />
          ) : (
            <Feather name="send" size={16} color="#0A0A0F" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: { padding: 8 },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  headerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#F0F0FA" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  onlineText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#22C55E" },
  msgList: { paddingHorizontal: 16, gap: 4 },
  bubbleRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  bubbleLeft: { justifyContent: "flex-start" },
  bubbleRight: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: 240,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#00D4FF",
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: "#12121C",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTextMe: { color: "#0A0A0F" },
  bubbleTextThem: { color: "#F0F0FA" },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    marginTop: 3,
    marginHorizontal: 4,
  },
  emptyChat: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyChatName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#F0F0FA" },
  emptyChatSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#444460",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#141420",
    backgroundColor: "#0A0A0F",
  },
  msgInput: {
    flex: 1,
    backgroundColor: "#0D0D18",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  sendBtn: {
    backgroundColor: "#00D4FF",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnPressed: { opacity: 0.8 },
});
