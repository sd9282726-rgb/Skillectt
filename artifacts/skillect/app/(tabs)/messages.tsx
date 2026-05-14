import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppContext, Conversation } from "@/context/AppContext";
import { Avatar } from "./index";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesScreen() {
  const { getConversations } = useAppContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations().then((c) => {
      setConvs(c);
      setLoading(false);
    });
  }, []);

  const TOP = 52 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            height: TOP,
          },
        ]}
      >
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={convs}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: TOP + 8,
            paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/messages/${item.otherUserId}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.avatarWrap}>
              <Avatar
                uri={item.otherAvatarUri}
                name={item.otherDisplayName}
                size={48}
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName}>{item.otherDisplayName}</Text>
                <Text style={styles.rowTime}>{timeAgo(item.lastMessageTime)}</Text>
              </View>
              <Text style={styles.rowLast} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="message-circle" size={32} color="#1E1E32" />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Find someone on Explore and start a conversation
              </Text>
              <Pressable
                onPress={() => router.replace("/(tabs)/explore")}
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreBtnText}>Go to Explore</Text>
              </Pressable>
            </View>
          )
        }
      />
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
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
  },
  list: { paddingHorizontal: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#0A0A0F",
  },
  rowInfo: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  rowName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#F0F0FA" },
  rowTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444460" },
  rowLast: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666688" },
  unreadBadge: {
    backgroundColor: "#00D4FF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#12121C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#444460",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#333358",
    textAlign: "center",
    lineHeight: 20,
  },
  exploreBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#00D4FF",
    borderRadius: 20,
  },
  exploreBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0A0A0F",
  },
});
